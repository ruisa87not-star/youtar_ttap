import type {FilePort} from '../platform/files';
import type {FileOutcome,HtmlSource} from './model';
import type {RegistrationBounds,RegistrationStatus} from './registration';
export interface DesktopBridge extends FilePort{
  openRegistration():Promise<void>;
  setRegistrationBounds(bounds:RegistrationBounds|null):void;
  getRegistrationStatus():Promise<RegistrationStatus>;
  reloadRegistration():Promise<void>;
  readRegistrationPage():Promise<FileOutcome<HtmlSource>>;
  setDirty(dirty:boolean):void;
  onCloseRequested(handler:()=>void):()=>void;
  confirmClose():Promise<void>;
}
declare global{interface Window{ttap?:DesktopBridge;}}
