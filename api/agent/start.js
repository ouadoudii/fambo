import {startNativeBrowser,getNativeViewer,releaseNativeBrowser,classifyNativeBrowserError} from '../../lib/cloudflare-native-browser.js';
import {agentLaunchAllowed} from '../../lib/agent-policy.js';
import {cookieValue,deviceCookie,ticketCookie,createSessionTicket,verifySessionTicket,newDevice} from '../../lib/agent-device.js';
import {browserBudgetDecision,releaseBrowserReservation} from '../../lib/agent-budget.js';
import {startCloudBrowser,getCloudViewer,releaseCloudBrowser,BrowserbaseSessionError} from '../../lib/browserbase-sessions.js';
const COOKIE='__Host-fambo_device';
const VALID=/^[A-Za-z0-9_-]{43}$/;
export function expectedOrigin(req){
 const host=String(req.headers?.host||'').toLowerCase();
 // Host allowlist prevents redirecting user traffic to a spoofed domain.
 if(host==='fambo.vercel.app'||host==='fambo-dadda3ettaa-4200.vercel.app'||host==='fambo-family.netlify.app'||host==='fambo.dadda-3ettaa.workers.dev')return 'https://'+host;
 return '';
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
 const origin=expectedOrigin(req);
 if(!origin||req.headers?.origin!==origin||!String(req.headers?.['content-type']||'').startsWith('application/json'))return res.status(403).json({error:'Anfrage nicht erlaubt'});
 const env=req.runtimeEnv||process.env;
 if(!agentLaunchAllowed(env))return res.status(503).json({error:'Browser-Anmeldung ist noch nicht freigeschaltet.'});
 let device=cookieValue(req,COOKIE);
 if(!VALID.test(device))device=newDevice();
 // Reuse the device-bound active session before attempting another costly launch.
 const existing=verifySessionTicket(cookieValue(req,'__Host-fambo_browser'),{deviceId:device,secret:env.FAMBO_AGENT_SIGNING_KEY});
 if(existing){
  try{
   await (env.BROWSER?getNativeViewer(existing.sessionId,{env}):getCloudViewer(existing.sessionId,{env}));
   return res.status(200).json({status:'reused'});
  }catch{
   // Invalid upstream session is never trusted; normal quota rules still apply.
  }
 }
 const budget=await browserBudgetDecision({deviceId:device,env});
 if(!budget.allowed)return res.status(budget.reason==='budget_unavailable'?503:429).json({error:'Browser momentan nicht verfügbar.',reason:budget.reason});
 let session;
 try{
  session=await (env.BROWSER?startNativeBrowser({env}):startCloudBrowser({env}));
  const ticket=createSessionTicket({sessionId:session.sessionId,deviceId:device,secret:env.FAMBO_AGENT_SIGNING_KEY});
  res.setHeader('Set-Cookie',[deviceCookie(device),ticketCookie(ticket)]);
  return res.status(201).json({status:'created'});
 }catch(error){
  // Only this request's lock may be released; daily counters remain consumed.
  if(session?.sessionId)try{await (env.BROWSER?releaseNativeBrowser(session.sessionId,{env}):releaseCloudBrowser(session.sessionId,{env}))}catch{}
  await releaseBrowserReservation({reservation:budget.reservation,env});
  const reason=env.BROWSER?classifyNativeBrowserError(error):error instanceof BrowserbaseSessionError?error.reason:'session_setup_failed';
  return res.status(502).json({error:'Browser konnte nicht gestartet werden.',reason});
 }
}
