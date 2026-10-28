// @vitest-environment node
import {expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,cpSync,realpathSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
it('production entry rejects missing/insecure/same-origin configuration and never enables test overrides',()=>{
  for(const pair of [{},{PROXY_PUBLIC_ORIGIN:'http://127.0.0.1:4187',PLANNER_ORIGIN:'http://127.0.0.1:4177'},{PROXY_PUBLIC_ORIGIN:'https://planner.example.com',PLANNER_ORIGIN:'https://planner.example.com'}]){
    const result=spawnSync(process.execPath,['server/registration-proxy/main.ts'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,ALLOW_INSECURE:'true',UPSTREAM_URL:'http://127.0.0.1:1',...pair}});expect(result.status).toBe(1);expect(result.stdout).not.toContain('started');expect(result.stderr).toBe('{"event":"startup_failed","code":"invalid_proxy_origins"}\n');
  }
});
it('fails safely before listening when the generated bridge is missing',()=>{
  const cache=resolve('.cache');mkdirSync(cache,{recursive:true});const parent=realpathSync(cache),temporary=mkdtempSync(join(parent,'proxy-cli-'));
  try{cpSync('server',join(temporary,'server'),{recursive:true});cpSync('src/shared',join(temporary,'src/shared'),{recursive:true});
    const result=spawnSync(process.execPath,[join(temporary,'server/registration-proxy/main.ts')],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,PROXY_PUBLIC_ORIGIN:'https://registration.example.com',PLANNER_ORIGIN:'https://planner.example.com'}});expect(result.status).toBe(1);expect(result.stdout).toBe('');expect(result.stderr).toBe('{"event":"startup_failed","code":"startup_configuration"}\n');
  }finally{const target=realpathSync(temporary);if(target.startsWith(parent+sep+'proxy-cli-'))rmSync(target,{recursive:true,force:true});}
});
