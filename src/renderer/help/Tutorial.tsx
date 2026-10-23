import {useState} from 'react';

const steps=[
  {title:'Get your course data.',body:null},
  {title:'Choose your courses and free time.',body:<><p>Select courses in the sidebar. Courses with no compatible group are disabled and explain the clash. Use the right arrow on a selected course to choose its lecture, tutorial or practical group.</p><p>Use the sidebar button beside <strong>Courses</strong> to give the timetable more room. Add your unavailable times under <strong>Conditions</strong>. On smaller screens, use the three panel buttons.</p></>},
  {title:'Compare your options, then save.',body:<><p>Clashes are checked as soon as you select a course or change a group. Browse the compatible timetable options. Select a class to see all its meetings and rooms.</p><p>Use <strong>Export image</strong> to save your timetable, chosen groups and registration instructions in one PNG. Follow that image to complete your actual course registration on the UTAR website.</p></>},
];

export function Tutorial({onDone}:{onDone:()=>void}){
  const[index,setIndex]=useState(0);const step=steps[index];
  return <section className="tutorial" aria-label="Getting started tutorial">
    <div className="tutorial-heading"><div><h1 tabIndex={-1}>A quick tour of youtar_ttap.</h1><p>From your UTAR courses to a timetable you can compare.</p></div><button className="quiet" onClick={onDone}>Skip tutorial</button></div>
    <ol className="tutorial-progress" aria-label="Tutorial progress">{['Import courses','Choose classes','Compare timetables'].map((label,i)=><li key={label} aria-current={i===index?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
    <div className="tutorial-step" aria-live="polite"><p className="step-count">Step {index+1} of {steps.length}</p><h2>{step.title}</h2>{index===0?<><p>Finish or skip this tour to see the UTAR login form automatically. Sign in, then open <strong>Course Timetable Preview</strong>.</p><p>Choose <strong>Preview courses from this page</strong> to review the import. <strong>Add slots manually</strong> opens saved-HTML import and instructions. <strong>Try demo</strong> opens a sample course catalog and timetable.</p></>:step.body}</div>
    <div className="tutorial-actions"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>Previous step</button>{index===steps.length-1?<button className="primary" onClick={onDone}>Start planning</button>:<button className="primary" onClick={()=>setIndex(i=>i+1)}>Next step</button>}</div>
    <p className="tutorial-note">You can reopen this guide with the Tutorial button. Your current project stays in place.</p>
  </section>;
}
