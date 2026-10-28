export interface ProxyConfig {
  publicOrigin:string;plannerOrigin:string;host:string;port:number;secureCookies:boolean;trustedProxyIP?:string;
}
export class ProxyError extends Error {
  status:number;code:string;
  constructor(status:number,code:string){super(code);this.name='ProxyError';this.status=status;this.code=code;}
}
export interface TransportRequest {url:URL;method:'GET'|'POST';headers:Record<string,string>;body?:Uint8Array;}
export interface TransportResponse {status:number;headers:Headers;body:ReadableStream<Uint8Array>|null;}
export type Transport=(request:TransportRequest,signal:AbortSignal)=>Promise<TransportResponse>;
