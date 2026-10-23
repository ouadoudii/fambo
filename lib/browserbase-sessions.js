import {openWebUntisPage} from './browserbase-navigation.js';
/** Restricted server-only Browserbase REST calls. Never exposed as a public API. */
const BASE='https://api.browserbase.com/v1';
export class BrowserbaseSessionError extends Error {
 constructor(reason){super('Browserbase session failed');this.reason=reason;}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function credentials(env){
 if(!env.BROWSERBASE_API_KEY||!UUID.test(env.BROWSERBASE_PROJECT_ID||''))throw Error('Browserbase nicht eingerichtet');
 return {key:env.BROWSERBASE_API_KEY,projectId:env.BROWSERBASE_PROJECT_ID};
}
async function call(path,{method='GET',payload,env=process.env,fetcher=fetch}={}){
 const {key}=credentials(env);
 const response=await fetcher(BASE+path,{method,headers:{'X-BB-API-Key':key,'Accept':'application/json','Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),redirect:'manual',signal:AbortSignal.timeout(12000)});
 if(response.status>=300&&response.status<400)throw new BrowserbaseSessionError('upstream_redirect');
 if(response.status===401||response.status===403)throw new BrowserbaseSessionError('authentication');
 if(response.status===402)throw new BrowserbaseSessionError('billing');
 if(response.status===429)throw new BrowserbaseSessionError('quota');
 if(response.status>=500)throw new BrowserbaseSessionError('provider_unavailable');
 if(!response.ok)throw new BrowserbaseSessionError('request_rejected');
 return response.json();
}
export async function startCloudBrowser({env=process.env,fetcher=fetch,navigate=openWebUntisPage}={}){
 const {projectId}=credentials(env);
 const result=await call('/sessions',{method:'POST',payload:{projectId,browserSettings:{recordSession:false,logSession:false,solveCaptchas:false}},env,fetcher});
 if(!UUID.test(result?.id||''))throw Error('Ungültige Browserbase-Sitzung');
 // Initial navigation is best effort: keep the live session if CDP navigation fails.
 try{await navigate(result.connectUrl)}catch{}
 return {sessionId:result.id};
}
export async function getCloudViewer(sessionId,options={}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 const result=await call('/sessions/'+sessionId+'/debug',options);
 // The fullscreen viewer hides browser controls; show the interactive debugger instead.
 const raw=result?.debuggerUrl;
 let url;
 try{url=new URL(raw)}catch{throw Error('Ungültiger Viewer')}
 if(url.protocol!=='https:'||!(url.hostname==='browserbase.com'||url.hostname.endsWith('.browserbase.com')))throw Error('Ungültiger Viewer');
 return url.toString();
}
export async function releaseCloudBrowser(sessionId,options={}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 await call('/sessions/'+sessionId,{...options,method:'POST',payload:{status:'REQUEST_RELEASE'}});
 return true;
}
