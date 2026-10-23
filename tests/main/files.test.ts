// @vitest-environment node
import {promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {readHtmlPaths,readProjectText,writeProjectAtomically} from '../../src/main/files';
import {decodeProject,MAX_IMPORT_BYTES} from '../../src/shared/project';
import {makeProject} from '../fixtures/projects';
let dir:string;
beforeEach(async()=>{dir=await fs.mkdtemp(join(tmpdir(),'ttap-test-'));});
afterEach(async()=>{vi.restoreAllMocks();if(!resolve(dir).startsWith(resolve(tmpdir())+sep)||!dir.includes('ttap-test-'))throw new Error('Unsafe cleanup');await fs.rm(dir,{recursive:true,force:true});});
it('round-trips a native project and replaces an existing file',async()=>{
  const path=join(dir,'sample.ttap.json');await fs.writeFile(path,'original');await writeProjectAtomically(path,makeProject());
  const raw=await readProjectText(path);expect(raw.name).toBe('sample.ttap.json');expect(decodeProject(raw.text)).toEqual({ok:true,value:makeProject()});expect(await fs.readdir(dir)).toEqual(['sample.ttap.json']);
});
it('preserves the original and cleans temporary files after rename fails',async()=>{
  const path=join(dir,'sample.ttap.json');await fs.writeFile(path,'original');vi.spyOn(fs,'rename').mockRejectedValueOnce(new Error('denied'));
  await expect(writeProjectAtomically(path,makeProject())).rejects.toThrow();expect(await fs.readFile(path,'utf8')).toBe('original');expect(await fs.readdir(dir)).toEqual(['sample.ttap.json']);
});
it('preserves the original and cleans temporary files after writing fails',async()=>{
  const path=join(dir,'sample.ttap.json');await fs.writeFile(path,'original');const open=fs.open.bind(fs);
  vi.spyOn(fs,'open').mockImplementationOnce(async(...args)=>{const file=await open(...args);vi.spyOn(file,'writeFile').mockRejectedValueOnce(new Error('disk full'));return file;});
  await expect(writeProjectAtomically(path,makeProject())).rejects.toThrow();expect(await fs.readFile(path,'utf8')).toBe('original');expect(await fs.readdir(dir)).toEqual(['sample.ttap.json']);
});
it('validates before overwriting',async()=>{
  const path=join(dir,'sample.ttap.json');await fs.writeFile(path,'original');const p=makeProject();p.schemaVersion=2 as 1;
  await expect(writeProjectAtomically(path,p)).rejects.toThrow();expect(await fs.readFile(path,'utf8')).toBe('original');
});
it('bounds native reads, including the combined HTML size',async()=>{
  const a=join(dir,'a.html'),b=join(dir,'b.htm');await fs.writeFile(a,' '.repeat(MAX_IMPORT_BYTES));await fs.writeFile(b,'x');
  expect((await readHtmlPaths([a]))[0].text.length).toBe(MAX_IMPORT_BYTES);await expect(readHtmlPaths([a,b])).rejects.toThrow(/10 MiB/);
  await fs.appendFile(a,'x');await expect(readProjectText(a)).rejects.toThrow(/10 MiB/);
});
it('rejects non-UTF-8 files and non-HTML selections',async()=>{
  const path=join(dir,'bad.html');await fs.writeFile(path,Buffer.from([0xff]));await expect(readHtmlPaths([path])).rejects.toThrow();await expect(readHtmlPaths([join(dir,'file.exe')])).rejects.toThrow();
});
