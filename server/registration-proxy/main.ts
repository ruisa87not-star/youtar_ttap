import {readFile} from 'node:fs/promises';
import {readConfig} from './config.ts';
import {createProxyServer} from './app.ts';
import {ProxyError} from './types.ts';

try{
  const config=readConfig(process.env),bridgeSource=await readFile(new URL('../../dist-proxy/bridge.js',import.meta.url),'utf8');
  const app=createProxyServer({config,bridgeSource,log:event=>process.stdout.write(JSON.stringify(event)+'\n')});
  app.server.on('error',()=>{process.stderr.write('{"event":"startup_failed","code":"listen_failed"}\n');process.exitCode=1;void app.close();});
  app.server.listen(config.port,config.host,()=>process.stdout.write('{"event":"started"}\n'));
  for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void app.close();});
}catch(error){process.stderr.write(JSON.stringify({event:'startup_failed',code:error instanceof ProxyError?error.code:'startup_configuration'})+'\n');process.exitCode=1;}
