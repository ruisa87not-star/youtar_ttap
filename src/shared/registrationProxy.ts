export const PROXY_CHANNEL='ttap-registration-v1';
export const PROXY_LOGIN_PATH='/portal/courseRegStu/login.jsp';
export const PROXY_SCHEDULE_PATHS=['/portal/courseRegStu/schedule/masterSchedule.jsp','/portal/courseRegStu/schedule/masterScheduleSurvey.jsp'] as const;
export interface RegistrationProxyConfig {origin:string;plannerOrigin:string;}
export type ProxyPageKind='login'|'schedule'|'other'|'expired'|'error';
export interface ProxyFrameStatus {kind:ProxyPageKind;loginError:string;error:string;}
