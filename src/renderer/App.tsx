import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {HtmlSource,Project,Timetable} from '../shared/model';
import {getFilePort} from '../platform/files';
import {ImportPanel} from './import/ImportPanel';
import {Planner} from './planner/Planner';
import {ProjectDialog} from './ProjectActions';
import {Tutorial} from './help/Tutorial';
import {RegistrationScreen} from './registration/RegistrationScreen';
import {createDemoProject} from './import/demoProject';
import {version} from '../../package.json';
import {renderRegistrationImage} from './planner/registrationImage';
import logo from '../assets/fork-logo.png';

type View='tutorial'|'import'|'planner';

export function App(){
  const [project,setProject]=useState<Project|null>(null);
  const [candidate,setCandidate]=useState<{project:Project;timetable:Timetable|undefined}|null>(null);
  const onTimetableChange=useCallback((source:Project,timetable:Timetable|undefined)=>setCandidate({project:source,timetable}),[]);
  const timetable=candidate?.project===project?candidate?.timetable:undefined;
  const [baseline,setBaseline]=useState('');const [views,setViews]=useState<View[]>(['tutorial']);
  const [importKey,setImportKey]=useState(0);const main=useRef<HTMLElement>(null);
  const [registrationSources,setRegistrationSources]=useState<HtmlSource[]|undefined>();
  const [manual,setManual]=useState(false);
  const view=views.at(-1)!;
  useEffect(()=>{document.title=`youtar_ttap ${version}`;},[]);
  function navigate(next:View){setViews(previous=>previous.at(-1)===next?previous:[...previous,next]);}
  function back(){setViews(previous=>previous.length>1?previous.slice(0,-1):previous);}
  function finishTutorial(){if(views.length===1)navigate('import');else back();}
  useEffect(()=>{main.current?.querySelector<HTMLElement>(`[data-view="${view}"] h1`)?.focus();},[view]);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [pending,setPending]=useState<{run:()=>void}|null>(null);
  const [download,setDownload]=useState<{snapshot:string;name:string;continueAfter:boolean}|null>(null);
  const snapshot=project?JSON.stringify({project,classIds:timetable?.classIds??[]}):'';const dirty=!!project&&snapshot!==baseline;
  const current=useRef(snapshot);
  const currentDirty=useRef(dirty);
  useLayoutEffect(()=>{current.current=snapshot;currentDirty.current=dirty;},[snapshot,dirty]);
  useEffect(()=>{
    if(window.ttap){window.ttap.setDirty(dirty);return;}
    if(!dirty)return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  useEffect(()=>window.ttap?.onCloseRequested(()=>{
    if(busy)return;
    const run=()=>{setPending(null);void window.ttap?.confirmClose();};
    if(dirty)setPending({run});else run();
  }),[dirty,busy]);
  function replace(next:Project){
    const run=()=>{setProject(next);setBaseline('');navigate('planner');setManual(false);setPending(null);setError('');setNotice('');};
    if(currentDirty.current)setPending({run});else run();
  }
  async function exportCurrent(continueAfter=false){
    if(!project||!timetable||busy)return;
    const savedSnapshot=snapshot;setBusy(true);setError('');
    try{
      const result=await getFilePort().exportImage(renderRegistrationImage(project,timetable));
      if(result.status==='error')setError(result.message);
      if(result.status==='ok'){
        if(result.value.kind==='downloaded')setDownload({snapshot:savedSnapshot,name:result.value.name,continueAfter});
        else{
          setBaseline(savedSnapshot);setNotice(`Saved ${result.value.name}.`);
          if(continueAfter&&current.current===savedSnapshot)pending?.run();
        }
      }
    }catch(e){setError(e instanceof Error?e.message:'The timetable image could not be exported.');}finally{setBusy(false);}
  }
  function keptDownload(){
    if(!download)return;
    setBaseline(download.snapshot);setNotice(`Exported ${download.name}.`);setDownload(null);
    if(download.continueAfter&&current.current===download.snapshot)pending?.run();
  }
  return <><header className="app-header"><div className="header-start">
      {views.length>1&&<button className="back-button quiet" aria-label="Go back" onClick={back}><span aria-hidden="true">←</span> Back</button>}
      <a className="brand" href="#" aria-label="youtar_ttap UTAR timetable planner" onClick={e=>{e.preventDefault();navigate('import');}}><img className="brand-mark" src={logo} alt=""/><span className="brand-name">youtar_ttap<small className="brand-version">v{version}</small></span><span className="brand-description">UTAR timetable planner</span></a>
    </div>{view!=='tutorial'&&<button className="quiet tutorial-button" onClick={()=>navigate('tutorial')}>Tutorial</button>}</header>
    <main ref={main}>
      {error&&!pending&&<p className="error app-message" role="alert">{error}</p>}{notice&&<p className="app-message" role="status">{notice}</p>}
      {view==='tutorial'&&<div className="screen-view" data-view="tutorial"><Tutorial onDone={finishTutorial}/></div>}
      <div className="screen-view registration-home" data-view="import" hidden={view!=='import'}>{project?<div className="import-back"><div><h1 tabIndex={-1}>Import courses.</h1><p>Importing replaces the courses in this project.</p></div><button onClick={()=>navigate('planner')}>Back to planner</button></div>:<div className="home-heading"><h1 tabIndex={-1}>Plan your semester.</h1><p>Sign in to UTAR, import your courses, then build your timetable.</p></div>}
        <RegistrationScreen suspended={view!=='import'||manual||!!pending||!!download} onSource={source=>{setRegistrationSources([source]);setImportKey(k=>k+1);setManual(true);}}/>
        <div className="home-actions"><button onClick={()=>{setRegistrationSources(undefined);setManual(true);}}>Add slots manually</button><button className="primary" onClick={()=>replace(createDemoProject())}>Try demo</button></div>
      </div>
      {project&&<div className="screen-view" data-view="planner" hidden={view!=='planner'}><Planner project={project} onChange={setProject} onTimetableChange={onTimetableChange} onExport={()=>exportCurrent()} exporting={busy} exported={!dirty}/></div>}
    </main>
    {manual&&<ProjectDialog title="Add slots manually" className="manual-dialog" dismissOnBackdrop onCancel={()=>setManual(false)}><button className="dialog-close quiet" aria-label="Close manual import" onClick={()=>setManual(false)}>×</button><ImportPanel key={importKey} initialSources={registrationSources} onConfirm={r=>replace({schemaVersion:1,sources:r.sources,courses:r.courses,selection:{courseCodes:[],lockedClassIds:[],blocked:[]}})}/></ProjectDialog>}
    {pending&&!download&&<ProjectDialog title="Keep your changes?" onCancel={()=>{if(!busy)setPending(null);}}><p>Export your timetable and registration instructions as an image before continuing, or discard the changes.</p>{!timetable&&<p>Select courses and resolve clashes to export an image.</p>}{error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button disabled={busy} onClick={()=>setPending(null)}>Cancel</button><button disabled={busy} onClick={()=>pending.run()}>Discard changes</button><button className="primary" disabled={busy||!timetable} onClick={()=>exportCurrent(true)}>Export and continue</button></div></ProjectDialog>}
    {download&&<ProjectDialog title="Keep your download" onCancel={()=>setDownload(null)}><p>Your browser started downloading {download.name}. Keep that image before marking your timetable as exported.</p><div className="actions"><button onClick={()=>setDownload(null)}>Keep editing</button><button className="primary" onClick={keptDownload}>I kept the file</button></div></ProjectDialog>}
  </>;
}
