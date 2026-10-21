/**
 * Browserbase server adapter. NEVER import from frontend assets.
 *
 * A browser session is billable and controls an authenticated browser.
 * This module intentionally exposes no public HTTP route.
 */
const BASE='https://api.browserbase.com/v1';
function config(env=process.env){
 const apiKey=env.BROWSERBASE_API_KEY;
 const projectId=env.BROWSERBASE_PROJECT_ID;
 if(!apiKey||!projectId)throw Error('Browserbase ist noch nicht konfiguriert.');
 if(typeof apiKey!=='string'||typeof projectId!=='string'||/[\r\n]/.test(apiKey+projectId))
   throw Error('Ungültige Browserbase-Konfiguration.');
 return {apiKey,projectId};
}
async function request(path,{method='GET',body,env=process.env,fetcher=fetch}={}){
 const {apiKey}=config(env);
 const response=await fetcher(BASE+path,{
  method,headers:{'X-BB-API-Key':apiKey,'Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{}),
  redirect:'error',signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error('Browserbase-Anfrage fehlgeschlagen ('+response.status+').');
 return response.json();
}
/** Only called after an authorized, rate-limited server-side user action. */
export async function createPrivateSession({env=process.env,fetcher=fetch}={}){
 const {projectId}=config(env);
 const session=await request('/sessions',{method:'POST',body:{projectId,api_timeout:900,region:'eu-central-1'},env,fetcher});
 if(!/^[0-9a-f-]{36}$/i.test(session?.id||''))throw Error('Browserbase hat keine gültige Session-ID geliefert.');
 // Do not expose connectUrl, signingKey, API keys, or session cookies to the frontend.
 return {id:session.id,status:session.status};
}
export async function getPrivateViewer(sessionId,{env=process.env,fetcher=fetch}={}){
 if(!/^[0-9a-f-]{36}$/i.test(sessionId))throw Error('Ungültige Browser-Sitzung.');
 const data=await request('/sessions/'+sessionId+'/debug',{env,fetcher});
 const url=new URL(data.debuggerFullscreenUrl||data.debuggerUrl);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.browserbase.com'))
  throw Error('Browserbase hat keinen gültigen Viewer geliefert.');
 // The URL is a bearer capability. Never log or store it publicly.
 return url.toString();
}
export async function stopSession(sessionId,{env=process.env,fetcher=fetch}={}){
 if(!/^[0-9a-f-]{36}$/i.test(sessionId))throw Error('Ungültige Browser-Sitzung.');
 await request('/sessions/'+sessionId,{method:'POST',body:{status:'REQUEST_RELEASE'},env,fetcher});
 return true;
}
