import {useEffect,useId,useMemo,useRef,useState} from 'react';
import type {Project,Selection,SolveResult,Timetable} from '../../shared/model';
import {SolverClient} from '../../workers/SolverClient';
import {CourseList,SidebarIcon} from './CourseList';
import {ConstraintsPanel} from './ConstraintsPanel';
import {TimetableView} from './TimetableView';
import {CourseSummary} from './CourseSummary';
import {TimeConstraintsDialog} from './TimeConstraintsDialog';

export function Planner({project,onChange,onTimetableChange,onExport,exporting=false,exported=false}:{project:Project;onChange:(p:Project)=>void;onTimetableChange?:(project:Project,timetable:Timetable|undefined)=>void;onExport?:()=>void;exporting?:boolean;exported?:boolean}){
  const client=useMemo(()=>new SolverClient(),[]);const run=useRef(0);
  const availabilityClient=useMemo(()=>new SolverClient(),[]);
  const[availability,setAvailability]=useState<{project:Project;values:Record<string,boolean>}|null>(null);const[availabilityError,setAvailabilityError]=useState('');const[retry,setRetry]=useState(0);
  const[completed,setCompleted]=useState<{project:Project;result:SolveResult}|null>(null);const[index,setIndex]=useState(0);
  const result=completed?.project===project?completed.result:null;
  const[status,setStatus]=useState<'idle'|'running'|'done'>(()=>project.selection.courseCodes.length?'running':'idle');const[error,setError]=useState('');
  const[panel,setPanel]=useState<'courses'|'timetable'|'conditions'>('timetable');
  const[collapsed,setCollapsed]=useState(false);const coursePanelId=useId();
  const[timeConstraints,setTimeConstraints]=useState(false);const[summary,setSummary]=useState(false);
  // Each project owns a request generation; commit cleanup invalidates queued work.
  useEffect(()=>{
    const id=++run.current;client.cancel();
    async function generate(){
      await Promise.resolve();
      if(id!==run.current)return;
      setError('');setCompleted(null);setIndex(0);
      if(!project.selection.courseCodes.length){setStatus('idle');return;}
      setStatus('running');
      try{const found=await client.solve({courses:project.courses,selection:project.selection});if(id!==run.current)return;setCompleted({project,result:found});setIndex(0);setStatus('done');}
      catch(e){if(id!==run.current)return;setStatus('idle');if(!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'The timetable search failed.');}
    }
    void generate();
    return ()=>{run.current=id+1;client.cancel();};
  },[project,client,retry]);
  useEffect(()=>()=>client.dispose(),[client]);
  useEffect(()=>{
    let active=true;
    async function checkAvailability(){
      await Promise.resolve();if(!active)return;
      setAvailability(null);setAvailabilityError('');
      try{const values=await availabilityClient.availability({courses:project.courses,selection:project.selection});if(active)setAvailability({project,values});}
      catch(e){if(active&&!(e instanceof DOMException&&e.name==='AbortError'))setAvailabilityError('Course availability could not be checked. Try Retry check.');}
    }
    void checkAvailability();
    return ()=>{active=false;availabilityClient.cancel();};
  },[project,availabilityClient,retry]);
  useEffect(()=>()=>availabilityClient.dispose(),[availabilityClient]);
  const timetable=result?.solutions[index];
  useEffect(()=>{onTimetableChange?.(project,timetable);},[project,timetable,onTimetableChange]);
  const change=(selection:Selection)=>onChange({...project,selection});
  function cancel(){++run.current;client.cancel();setStatus('idle');setError('');}
  const count=result?.solutions.length??0;
  return <section className="planner">
    <div className="planner-title">
      <div><h1 tabIndex={-1}>Build your week.</h1><p>{project.sources.some(s=>s.startsWith('Demo'))?`Demo catalog: ${project.courses.length} courses with sample groups and times.`:'Choose courses. Clashes and timetable options update automatically.'}</p></div>
      <div className="planner-actions">
        <p className="selection-count">{project.selection.courseCodes.length?<><strong>{project.selection.courseCodes.length}</strong> courses selected</>:'Choose a course to begin.'}</p>
        {onExport&&<><span className={exported?'saved-label':'dirty-label'} role="status">{exported?'Image exported':'Image not exported'}</span><button className="primary" disabled={exporting||!timetable} onClick={onExport}>{exporting?'Exporting…':'Export image'}</button></>}
      </div>
    </div>
    <div className={'selection-feedback'+(result&&count===0?' has-clash':'')}><span role={result&&count===0?'alert':'status'}>{error||availabilityError|| (status==='running'?'Checking courses and groups…':count>0?'No clashes. Your selected courses fit together.':result?'Course Clash':project.selection.courseCodes.length?'Check paused. Try Retry check.':'Select courses to check for clashes automatically.')}</span>{status==='running'?<button className="quiet" onClick={cancel}>Cancel calculation</button>:(error||availabilityError||(!result&&project.selection.courseCodes.length>0))&&<button onClick={()=>setRetry(n=>n+1)}>Retry check</button>}</div>
    <nav className="mobile-panels" aria-label="Planner panels">{(['courses','timetable','conditions'] as const).map(p=><button key={p} aria-pressed={p===panel} onClick={()=>{setPanel(p);if(p==='courses')setCollapsed(false);}}>{p==='courses'?'Courses':p==='timetable'?'Timetable':'Conditions'}</button>)}</nav>
    <div className={'planner-grid panel-'+panel+(collapsed?' courses-collapsed':'')}>
      <button className="course-sidebar-toggle sidebar-button quiet" aria-label={collapsed?'Expand course sidebar':'Collapse course sidebar'} aria-expanded={!collapsed} aria-controls={coursePanelId} onClick={()=>setCollapsed(value=>!value)}><SidebarIcon/></button>
      {collapsed&&<div className="sidebar-rail" aria-hidden="true"/>}
      <aside className="courses-panel" id={coursePanelId}><CourseList project={project} onChange={change} availability={availability?.project===project?availability.values:undefined}/></aside>
      <div className={'schedule-panel'+(summary?' summary-open':'')}><div className="schedule-toolbar"><h2>Your timetable</h2><span>All class meetings</span></div>
        <div className="result-toolbar" aria-live="polite">
          {status==='running'?<span>Finding your options…</span>:count>0?<><button aria-label="Previous timetable" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>‹</button><strong>Option {index+1} of {count}</strong><button aria-label="Next timetable" disabled={index===count-1} onClick={()=>setIndex(i=>i+1)}>›</button></>:<span>Your schedule will appear here.</span>}
        </div>
        {result?.truncated&&<p className="limit-note">Showing the first 500 options. Narrow your conditions to explore a smaller set.</p>}
        {error&&<p role="alert" className="error">{error}</p>}
        <TimetableView courses={project.courses} timetable={timetable} blocked={project.selection.blocked}/>
        {summary&&<CourseSummary courses={project.courses} selectedCodes={project.selection.courseCodes} timetable={result?.solutions[index]}/>}
        <div className="schedule-secondary"><button onClick={()=>setTimeConstraints(true)}>Set time constraint</button><button aria-expanded={summary} onClick={()=>setSummary(value=>!value)}>{summary?'Hide summary':'Show summary'}</button></div>
        <p className="calendar-note">All class meetings are shown. Select a class for rooms and dates.</p>
      </div>
      <aside className="conditions-panel"><ConstraintsPanel selection={project.selection} onChange={change}/></aside>
    </div>
    {timeConstraints&&<TimeConstraintsDialog courses={project.courses} timetables={result?.solutions??[]} blocked={project.selection.blocked} onCancel={()=>setTimeConstraints(false)} onApply={blocked=>{change({...project.selection,blocked});setTimeConstraints(false);}}/>}
  </section>;
}
