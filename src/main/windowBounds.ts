import type {Rectangle} from 'electron';

export function initialWindowBounds(area:Rectangle){
  const width=Math.min(1440,area.width),height=Math.min(940,area.height);
  return {x:area.x+Math.floor((area.width-width)/2),y:area.y+Math.floor((area.height-height)/2),width,height,minWidth:Math.min(600,width),minHeight:Math.min(560,height)};
}
