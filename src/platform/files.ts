import type {ExportReceipt,FileOutcome,HtmlSource,Project} from '../shared/model';
import {browserFilePort} from './browser';
import {createElectronFilePort} from './electron';
export interface FilePort {
  pickHtml():Promise<FileOutcome<HtmlSource[]>>;
  openProject():Promise<FileOutcome<{name:string;text:string}>>;
  exportProject(project:Project):Promise<FileOutcome<ExportReceipt>>;
  exportImage(png:string):Promise<FileOutcome<ExportReceipt>>;
}
export function getFilePort():FilePort{return window.ttap?createElectronFilePort(window.ttap):browserFilePort;}
