import {openWebUntisPage} from './browserbase-navigation.js';
import {INSPECT,normalizeSessionLessons,safeWebUntisHost} from './webuntis-session-import.js';
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
 // A blank inspector is not a successful login flow. Fail closed when navigation
 // did not happen, and release the unusable session instead of charging for it.
 let navigated=false,diagnostic='navigation_failed';
 // Browserbase's session-debug endpoint also exposes wsUrl. Use it as a
 // documented fallback when the create response has no usable connectUrl.
 // Never return either websocket URL to the browser; navigation validates it.
 const validWs=url=>{
  try{const parsed=new URL(url);return parsed.protocol==='wss:'&&parsed.hostname==='connect.browserbase.com'&&parsed.username===''&&parsed.password==='';}
  catch{return false}
 };
 let endpoint=result.connectUrl;
 if(!validWs(endpoint)){
  try{
   const debug=await call('/sessions/'+result.id+'/debug',{env,fetcher});
   endpoint=debug?.wsUrl;
  }catch{endpoint=undefined}
 }
 try{navigated=await navigate(endpoint,{onFailure:reason=>{diagnostic=reason}})}catch{}
 if(!navigated){
  try{await call('/sessions/'+result.id,{method:'POST',payload:{status:'REQUEST_RELEASE'},env,fetcher})}catch{}
  throw new BrowserbaseSessionError(diagnostic);
 }
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

/** Read only the allowed lesson fields from an authenticated WebUntis browser tab. */
export async function inspectBrowserbaseLessons(sessionId,{env=process.env,fetcher=fetch,WebSocketImpl=globalThis.WebSocket,timeoutMs=9000}={}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 const debug=await call('/sessions/'+sessionId+'/debug',{env,fetcher});
 let endpoint;
 try{endpoint=new URL(debug.wsUrl)}catch{throw Error('Browser-Verbindung fehlt')}
 if(endpoint.protocol!=='wss:'||endpoint.hostname!=='connect.browserbase.com'||endpoint.username||endpoint.password||typeof WebSocketImpl!=='function')
  throw Error('Browser-Verbindung nicht zulässig');
 return new Promise((resolve,reject)=>{
  let socket,done=false,seq=0;
  const pending=new Map();
  const finish=(error,result)=>{
   if(done)return;done=true;clearTimeout(timer);
   for(const [,p] of pending)p.reject(Error('Sitzung beendet'));
   pending.clear();
   try{socket?.close()}catch{}
   error?reject(error):resolve(result);
  };
  const timer=setTimeout(()=>finish(Error('Browser-Zeitlimit erreicht')),timeoutMs);
  const send=(method,params={},sessionId)=>{
   if(done)return Promise.reject(Error('Sitzung beendet'));
   return new Promise((yes,no)=>{
    const id=++seq;pending.set(id,{resolve:yes,reject:no});
    try{socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))}
    catch(error){pending.delete(id);no(error)}
   });
  };
  try{
   socket=new WebSocketImpl(endpoint.toString());
   socket.addEventListener('message',event=>{
    let value;try{value=JSON.parse(String(event.data))}catch{return}
    const p=pending.get(value.id);if(!p)return;pending.delete(value.id);
    value.error?p.reject(Error('Browser-Befehl abgelehnt')):p.resolve(value.result||{});
   });
   socket.addEventListener('error',()=>finish(Error('Browser-Verbindung fehlgeschlagen')));
   socket.addEventListener('close',()=>finish(Error('Browser-Verbindung beendet')));
   socket.addEventListener('open',async()=>{
    try{
     const targets=await send('Target.getTargets');
     const page=targets.targetInfos?.find(t=>t.type==='page'&&safeWebUntisHost(t.url));
     if(!page)return finish(null,{status:'wrong_site',lessons:[]});
     const attach=await send('Target.attachToTarget',{targetId:page.targetId,flatten:true});
     if(!attach.sessionId)throw Error('Browser-Tab nicht erreichbar');
     const result=await send('Runtime.evaluate',{expression:INSPECT,returnByValue:true,awaitPromise:false},attach.sessionId);
     if(result.exceptionDetails||result.result?.value?.ok!==true)
      return finish(null,{status:'wrong_site',lessons:[]});
     const lessons=normalizeSessionLessons(result.result.value.lessons);
     finish(null,{status:lessons.length?'ready':'unsupported_layout',lessons});
    }catch(error){finish(error)}
   });
  }catch(error){finish(error)}
 });
}
