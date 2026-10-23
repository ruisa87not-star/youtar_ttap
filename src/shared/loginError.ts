// This function is also serialized into the isolated UTAR view. Keep it self-contained.
export function readLoginError(doc:Document):string{
  const selectors='[role="alert"],.error,.error-message,.login-error,.alert-danger,.text-danger,#errorMessage,#errorMsg,#error-message,font[color="red" i],font[color="#ff0000" i]';
  const messages:string[]=[];
  for(const element of Array.from(doc.querySelectorAll(selectors)).slice(0,10)){
    if(element.closest('[hidden]'))continue;
    let hidden=false;for(let parent:Element|null=element;parent;parent=parent.parentElement){const style=doc.defaultView?.getComputedStyle(parent);if(style?.display==='none'||style?.visibility==='hidden'){hidden=true;break;}}
    if(hidden||element.matches('input,textarea,select')||element.querySelector('input,textarea,select'))continue;
    const text=(element.textContent??'').trim().replace(/\s+/g,' ').slice(0,500);if(text&&!messages.includes(text))messages.push(text);
  }
  return messages.join(' ').slice(0,500);
}
