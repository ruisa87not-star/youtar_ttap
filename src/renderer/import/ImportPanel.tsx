import { useEffect,useState } from 'react';
import type { HtmlSource, ImportResult } from '../../shared/model';
import { readHtmlFiles } from '../../platform/browserFiles';
import {getFilePort} from '../../platform/files';
import { parseUtarHtml } from './parseUtarHtml';
import {ManualImportGuide} from '../help/ManualImportGuide';

export function ImportPanel({onConfirm,initialSources}: { onConfirm: (result: ImportResult) => void;initialSources?:HtmlSource[] }) {
  const [pasting,setPasting]=useState(false); const [html,setHtml]=useState('');
  const [preview,setPreview]=useState<ImportResult|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{if(initialSources)void previewSources(initialSources);},[initialSources]);
  async function previewSources(sources: HtmlSource[]) {
    setBusy(true); setError('');
    // Let the importing state paint before synchronous, bounded DOM parsing.
    await new Promise(resolve=>setTimeout(resolve,0));
    try { setPreview(parseUtarHtml(sources)); } catch { setError('This page could not be parsed. Try saving the master schedule again.'); }
    finally { setBusy(false); }
  }
  async function files(list: File[]) {
    const result=await readHtmlFiles(list);
    if (result.status==='ok') await previewSources(result.value);
    if (result.status==='error') setError(result.message);
  }
  async function pick(){
    setError('');
    try{const result=await getFilePort().pickHtml();if(result.status==='ok')await previewSources(result.value);else if(result.status==='error')setError(result.message);}
    catch{setError('The schedule files could not be opened.');}
  }
  return <section className="import-panel" aria-label="Import courses">
    <div className="import-heading"><p>Save your UTAR master schedule as HTML, then add it here.</p></div>
    {!preview && <>
      <ManualImportGuide/>
      <div className="import-tabs"><button className={!pasting?'active':''} onClick={()=>setPasting(false)}>HTML files</button><button className={pasting?'active':''} onClick={()=>setPasting(true)}>Paste HTML</button></div>
      {pasting ? <label className="paste-label">UTAR course HTML<textarea value={html} onChange={e=>setHtml(e.target.value)} placeholder="Paste the HTML from your UTAR master schedule." spellCheck={false}/></label> :
        <div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy) files(Array.from(e.dataTransfer.files));}}>
          <span className="file-symbol" aria-hidden="true">＋</span><h3>Drop your schedule pages here</h3><p>You can add several HTML pages together.</p>
          <button className="primary" onClick={pick} disabled={busy}>Choose HTML files</button>
          <small>.html or .htm · up to 10 MiB in total</small>
        </div>}
      <div className="import-footer"><span>Your course data stays on this device.</span><button onClick={()=>previewSources([{name:'Pasted HTML',text:html}])} disabled={busy||!html.trim()}>Preview import</button></div>
    </>}
    {busy && <p role="status">Importing…</p>}{error && <p role="alert" className="error">{error}</p>}
    {preview && <div className="import-preview">
      <div className="preview-count"><strong>{preview.courses.length} courses</strong><span>{preview.courses.reduce((n,c)=>n+c.classes.length,0)} classes found</span></div>
      <ul className="preview-courses">{preview.courses.map(c=><li key={c.code}><b>{c.code}</b><span>{c.name}</span><small>{c.classes.length} classes</small></li>)}</ul>
      {preview.issues.length>0 && <div className="import-issues" role="alert"><h3>Check the import notes</h3><ul>{preview.issues.map((i,n)=><li key={n}>{i.source}{i.row ? `, row ${i.row}`:''}: {i.message}</li>)}</ul></div>}
      <div className="actions"><button onClick={()=>setPreview(null)}>Cancel import</button><button className="primary" disabled={!preview.courses.length||busy} onClick={()=>onConfirm(preview)}>Use these courses</button></div>
    </div>}
  </section>;
}
