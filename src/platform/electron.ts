import type {DesktopBridge} from '../shared/bridge';
import type {FilePort} from './files';
export function createElectronFilePort(bridge:DesktopBridge):FilePort{
  return {pickHtml:()=>bridge.pickHtml(),openProject:()=>bridge.openProject(),exportProject:project=>bridge.exportProject(project),exportImage:png=>bridge.exportImage(png)};
}
