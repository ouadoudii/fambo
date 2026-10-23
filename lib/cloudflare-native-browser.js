/** Native Cloudflare Browser Run adapter. All live-view links stay device-ticket protected. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function binding(env){if(!env?.BROWSER||typeof env.BROWSER.acquire!=='function')throw Error('Browser Run nicht eingerichtet');return env.BROWSER}
export async function startNativeBrowser({env}){
 const b=binding(env);
 const session=await b.acquire({keepAlive:900000,targets:true,recording:false});
 if(!UUID.test(session?.sessionId||''))throw Error('Ungültige Browser Run Sitzung');
 try{
  // Open the official WebUntis portal, not an empty about:blank tab.
  await b.devtools.newTarget(session.sessionId,'https://webuntis.com/');
  return {sessionId:session.sessionId};
 }catch(error){
  await b.closeSession(session.sessionId).catch(()=>{});
  throw error;
 }
}
export async function getNativeViewer(sessionId,{env}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 const b=binding(env);
 const targets=await b.devtools.listTargets(sessionId,{liveViewUrlExpiresInMs:300000});
 const target=targets.find(t=>t.type==='page'&&t.url?.startsWith('https://webuntis.com/'))||targets.find(t=>t.type==='page'&&t.url!=='about:blank')||targets.find(t=>t.type==='page');
 if(!target)throw Error('Keine Browserseite gefunden');
 const response=await b.getLiveView(sessionId,{targetId:target.id,mode:'full',expiresInMs:300000});
 let url;try{url=new URL(response.devtoolsFrontendUrl)}catch{throw Error('Ungültiger Browser-Viewer')}
 if(url.protocol!=='https:'||url.hostname!=='live.browser.run'||!url.searchParams.has('wss'))throw Error('Ungültiger Browser-Viewer');
 return url.toString();
}
export async function releaseNativeBrowser(sessionId,{env}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 await binding(env).closeSession(sessionId);
 return true;
}
