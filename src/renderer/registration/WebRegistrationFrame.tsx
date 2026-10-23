import {useLayoutEffect,useRef,useState} from 'react';
import {UTAR_REGISTRATION_URL} from '../../shared/registration';

export function WebRegistrationFrame({compact,suspended,reloadKey,onLoad,onError}:{compact:boolean;suspended:boolean;reloadKey:number;onLoad:()=>void;onError:()=>void}){
  const viewport=useRef<HTMLDivElement>(null);const[size,setSize]=useState({width:896,height:308});
  useLayoutEffect(()=>{
    const element=viewport.current;if(!element)return;
    const measure=()=>{if(element.clientWidth&&element.clientHeight)setSize({width:element.clientWidth,height:element.clientHeight});};
    measure();const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);observer?.observe(element);
    return ()=>observer?.disconnect();
  },[suspended]);
  // Measured from the public UTAR login layout. Crop outside the cross-origin
  // document: its real form, CAPTCHA and HTTPS submission are left intact.
  // Keep a readable login surface on narrow screens, with horizontal panning.
  const fit=Math.min(1,Math.max(640,size.width)/896,size.height/308),scale=fit*1.25;
  const width=896*fit,height=308*fit;
  return <div ref={viewport} className="registration-web-viewport" hidden={suspended}>
    <div className="registration-web-crop" style={{width:compact?width:'100%',height:compact?height:'100%'}}>
      <iframe key={reloadKey} className="registration-frame" title="UTAR Course Registration System" src={UTAR_REGISTRATION_URL} scrolling={compact?'no':'auto'} onLoad={onLoad} onError={onError} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer" style={compact?{width:1480,height:2000,left:(width-1480*scale)/2,top:-146*scale,transform:`scale(${scale})`}:{width:'100%',height:'100%',left:0,top:0,transform:'none'}}/>
    </div>
  </div>;
}
