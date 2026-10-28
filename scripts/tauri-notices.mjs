import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync,mkdirSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,['scripts/tauri.mjs','cargo','metadata','--locked','--format-version=1','--filter-platform','x86_64-pc-windows-msvc'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true});
if(result.status!==0)throw Error(result.stderr||'Cargo metadata failed. Run cargo fetch first.');
const metadata=JSON.parse(result.stdout),nodes=new Map(metadata.resolve.nodes.map(node=>[node.id,node])),selected=new Set();
function visit(id){if(selected.has(id))return;selected.add(id);for(const dependency of nodes.get(id)?.deps??[])visit(dependency.pkg);}visit(metadata.resolve.root);
const packages=metadata.packages.filter(pkg=>selected.has(pkg.id)&&pkg.source).sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
const out=join(root,'licenses','tauri');mkdirSync(out,{recursive:true});
const tauri=packages.find(pkg=>pkg.name==='tauri');
function licenseFiles(directory){return readdirSync(directory).filter(name=>/^(LICEN[SC]E|COPYING|NOTICE)([._-]|$)/i.test(name)&&statSync(join(directory,name)).isFile()).sort().map(name=>({name,text:readFileSync(join(directory,name),'utf8')}));}
const overrides=join(root,'licenses','tauri-overrides');
const notices=['youtar_ttap Windows Tauri third-party notices','',
  'Generated from the locked Windows Cargo dependency graph, including build tools.',
  'These third-party sources are unmodified. Each exact source archive is linked below.',
  'MPL-2.0 source code is available from those links under MPL-2.0; see the full license below.',
  'The application MIT license does not restrict rights to third-party source code.',
  'Rust standard library notices: RUST-COPYRIGHT-library.html (distributed alongside this file).',''];
for(const pkg of packages){
  let texts=licenseFiles(dirname(pkg.manifest_path));
  if(!texts.length){
    const fallback=pkg.name==='alloc-stdlib'?'alloc-stdlib-LICENSE.txt':pkg.name.startsWith('webview2-com')?'webview2-LICENSE.txt':pkg.name==='selectors'?'MPL-2.0.txt':null;
    if(fallback)texts=[{name:fallback,text:readFileSync(join(overrides,fallback),'utf8')}];
    else if(pkg.name==='tauri-plugin')texts=licenseFiles(dirname(tauri.manifest_path));
    else throw Error(`Missing license text: ${pkg.name} ${pkg.version}`);
  }
  notices.push('='.repeat(72),`${pkg.name} ${pkg.version}`,`Declared license: ${pkg.license}`,`Authors: ${(pkg.authors??[]).join('; ')}`,`Repository: ${pkg.repository??''}`,`Source: https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`,...texts.flatMap(item=>['',`--- ${item.name} ---`,item.text]),'');
}
writeFileSync(join(out,'THIRD_PARTY_NOTICES.txt'),notices.join('\n'));
const localRust=join(root,'.cache','rustup','toolchains','stable-x86_64-pc-windows-msvc');
let sysroot=localRust;
if(!existsSync(localRust)){const rust=spawnSync('rustc',['--print','sysroot'],{encoding:'utf8',windowsHide:true});if(rust.status!==0)throw Error('Rust toolchain is required to collect standard library notices.');sysroot=rust.stdout.trim();}
copyFileSync(join(sysroot,'share','doc','rust','COPYRIGHT-library.html'),join(out,'RUST-COPYRIGHT-library.html'));
console.log(`Collected ${packages.length} locked Windows dependencies and Rust standard library notices.`);
