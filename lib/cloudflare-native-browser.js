/** Native Cloudflare Browser Run adapter. All live-view links stay device-ticket protected. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function binding(env){if(!env?.BROWSER||typeof env.BROWSER.acquire!=='function')throw Error('Browser Run nicht eingerichtet');return env.BROWSER}
export async function startNativeBrowser({env}){
 const b=binding(env);
 const session=await b.acquire({keepAlive:300000,targets:true,recording:false});
 if(!UUID.test(session?.sessionId||''))throw Error('Ungültige Browser Run Sitzung');
 // Acquiring the session is sufficient: a failed initial navigation must not destroy it.
 // Users can navigate to WebUntis in the interactive full browser view themselves.
 try{
  await b.devtools.newTarget(session.sessionId,'https://webuntis.com/');
 }catch{
  // A tab can already exist. Keep the acquired session and surface its Live View.
 }
 return {sessionId:session.sessionId};
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

/** Only emit a closed set of safe browser error categories; never leak provider responses. */
export function classifyNativeBrowserError(error){
 const message=String(error?.message||'').toLowerCase();
 const code=Number(error?.status||error?.statusCode||error?.code);
 if(code===429||/time limit exceeded|daily browser|daily limit|quota|usage limit|minutes of browser use/.test(message))return 'cloudflare_daily_limit';
 if(code===402||/payment required|billing|subscription|payment method/.test(message))return 'cloudflare_billing';
 if(code===401||code===403||/unauthorized|forbidden|permission denied/.test(message))return 'cloudflare_auth';
 if(/browser binding|not configured|nicht eingerichtet/.test(message))return 'cloudflare_binding';
 if(code>=500||/unavailable|timeout|timed out|capacity/.test(message))return 'cloudflare_unavailable';
 return 'session_setup_failed';
}
