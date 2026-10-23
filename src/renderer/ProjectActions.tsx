import {useEffect,useId,useRef,type CSSProperties,type ReactNode} from 'react';

export function ProjectDialog({title,onCancel,children,dismissOnBackdrop=false,className='',style}:{title:string;onCancel:()=>void;children:ReactNode;dismissOnBackdrop?:boolean;className?:string;style?:CSSProperties}){
  const ref=useRef<HTMLDialogElement>(null);const id=useId();
  const outside=useRef(false);
  function isOutside(event:React.MouseEvent<HTMLDialogElement>|React.PointerEvent<HTMLDialogElement>){const rect=event.currentTarget.getBoundingClientRect();return event.target===event.currentTarget&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);}
  useEffect(()=>{const dialog=ref.current!,previous=document.activeElement;dialog.showModal();return ()=>{dialog.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  return <dialog ref={ref} style={style} className={'project-dialog '+className} aria-labelledby={id} onPointerDown={e=>{outside.current=isOutside(e);}} onClick={e=>{if(dismissOnBackdrop&&outside.current&&isOutside(e))onCancel();}} onCancel={e=>{e.preventDefault();onCancel();}}><h2 id={id}>{title}</h2>{children}</dialog>;
}
