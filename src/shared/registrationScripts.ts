import {readLoginError} from './loginError.ts';

export const loginCSS=`
  html, body { margin:0 !important; padding:0 !important; min-width:0 !important; background:white; }
  body { padding:12px 0 8px !important; }
  #body_col { width:100% !important; }
  #body_col > table:not(:has(:is([role=alert],.error,.error-message,.login-error,.alert-danger,.text-danger,#errorMessage,#errorMsg,#error-message,font[color="red" i],font[color="#ff0000" i]))), body > br, body > table:not(:has(:is([role=alert],.error,.error-message,.login-error,.alert-danger,.text-danger,#errorMessage,#errorMsg,#error-message,font[color="red" i],font[color="#ff0000" i]))) { display:none !important; }
  #body_col h2 { margin:0 0 32px !important; text-align:center; font-size:32px; font-weight:400; }
  body > div:not(#body_col):not(:has(form)):not(:has(>strong)):not(:is([role=alert],.error,.error-message,.login-error,.alert-danger,.text-danger,#errorMessage,#errorMsg,#error-message)):not(:has(:is([role=alert],.error,.error-message,.login-error,.alert-danger,.text-danger,#errorMessage,#errorMsg,#error-message,font[color="red" i],font[color="#ff0000" i]))) { display:none !important; }
  form { margin:0; }
  form > table { width:calc(100% - 32px) !important; max-width:824px; table-layout:fixed; }
  form input:not([type=hidden]):not([type=submit]):not([type=reset]) { width:min(256px, 96%); box-sizing:border-box; }
  form img { max-width:96%; height:auto; }
  body > div:has(>strong) { margin-top:8px; text-align:center; }
  @media(max-width:480px) { #body_col h2 { font-size:24px; margin-bottom:20px !important; } form > table { width:calc(100% - 12px) !important; } form td { overflow-wrap:anywhere; } }
`;

export function readCourseTable(doc:Document):{kind:'table'|'login'|'missing'|'too-large';text?:string}{
  if(doc.querySelector('input[type="password"]'))return {kind:'login'};
  const table=doc.querySelector('#overviewSector table');
  if(!table)return {kind:'missing'};
  const text='<div id="overviewSector">'+table.outerHTML+'</div>';
  return new TextEncoder().encode(text).byteLength>10*1024*1024?{kind:'too-large'}:{kind:'table',text};
}

export function buildRegistrationScript():string{
  return `(()=>{
    const readLoginError=${readLoginError.toString()};
    const readCourseTable=${readCourseTable.toString()};
    function style(){
      if(location.pathname!=='/portal/courseRegStu/login.jsp'||document.querySelector('#ttap-registration-style'))return;
      const element=document.createElement('style');element.id='ttap-registration-style';element.textContent=${JSON.stringify(loginCSS)};
      (document.head||document.documentElement).append(element);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',style,{once:true});else style();
    window.__ttapRegistration={status:()=>({loginError:readLoginError(document)}),read:()=>readCourseTable(document)};
  })()`;
}
