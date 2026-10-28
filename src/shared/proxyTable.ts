import {readCourseTable} from './registrationScripts.ts';
const omitted='[session omitted]';
function redactText(container:Element,secrets:readonly string[]):boolean{
  const tokens=secrets.slice(0,16).filter(value=>value.length>0&&value.length<=512);
  // Numeric short tokens cannot be removed from course numbers without corrupting data.
  if(tokens.some(value=>value.length<8&&/^\d+$/.test(value)))return false;
  container.normalize();const texts:Array<{node:Text;value:string;start:number;end:number}>=[],stack:Node[]=[container];let length=0;
  while(stack.length){const node=stack.pop()!;if(node.nodeType===3){const text=node as Text;text.data=text.data.replace(/\bpassid\s*[:=]\s*[^\s<>]+/gi,omitted);const value=text.data;texts.push({node:text,value,start:length,end:length+value.length});length+=value.length;}else for(const child of [...node.childNodes].reverse())stack.push(child);}
  const joined=texts.map(item=>item.value).join(''),patterns=[...new Set(tokens.flatMap(value=>[value,encodeURIComponent(value)]))],ranges:Array<{start:number;end:number}>=[];
  for(const pattern of patterns){let start=joined.indexOf(pattern);while(start!==-1){if(ranges.length>=100_000)return false;ranges.push({start,end:start+pattern.length});start=joined.indexOf(pattern,start+pattern.length);}}
  ranges.sort((a,b)=>a.start-b.start);const merged:Array<{start:number;end:number}>=[];
  for(const range of ranges){const previous=merged.at(-1);if(previous&&range.start<=previous.end)previous.end=Math.max(previous.end,range.end);else merged.push({...range});}
  let first=0;
  for(const item of texts){let cursor=item.start,output='';while(first<merged.length&&merged[first].end<=item.start)first++;
    for(let i=first;i<merged.length&&merged[i].start<item.end;i++){const range=merged[i],start=Math.max(item.start,range.start),end=Math.min(item.end,range.end);output+=item.value.slice(cursor-item.start,start-item.start);if(range.start>=item.start)output+=omitted;cursor=end;}
    item.node.data=output+item.value.slice(cursor-item.start);
  }
  // Also fail closed on collisions in preserved structural attributes/markup.
  const html=container.outerHTML,text=container.textContent??'';return patterns.every(value=>!html.includes(value)&&!text.includes(value));
}
export function sanitizeCourseTable(doc:Document,secrets:readonly string[]):{kind:'table'|'login'|'missing'|'too-large'|'unsafe';text?:string}{
  const check=readCourseTable(doc);if(check.kind!=='table')return {kind:check.kind};
  const allowed=new Set(['table','thead','tbody','tfoot','tr','td','th','br']),drop=new Set(['script','style','noscript','template','form','input','button','select','textarea','iframe','object','embed','svg','math','img']);let count=0;
  const copy=(source:Node,target:Node,depth:number)=>{
    if(++count>100_000||depth>128)throw Error('limit');
    if(source.nodeType===3){target.appendChild(doc.createTextNode(source.textContent??''));return;}
    if(source.nodeType!==1)return;const original=source as Element,tag=original.localName.toLowerCase();if(drop.has(tag))return;
    let next=target;if(allowed.has(tag)){const node=doc.createElement(tag);for(const name of ['rowspan','colspan']){const value=original.getAttribute(name);if(value!==null)node.setAttribute(name,/^\d{1,5}$/.test(value)&&Number(value)>0?value:'0');}if(tag==='tr'&&/^subRow[\w-]{0,58}$/i.test(original.id))node.id=original.id;target.appendChild(node);next=node;}
    for(const child of original.childNodes)copy(child,next,depth+1);
  };
  try{const container=doc.createElement('div');container.id='overviewSector';copy(doc.querySelector('#overviewSector table')!,container,0);if(!redactText(container,secrets))return {kind:'unsafe'};const text=container.outerHTML;return new TextEncoder().encode(text).byteLength>10*1024*1024?{kind:'too-large'}:{kind:'table',text};}catch{return {kind:'too-large'};}
}
