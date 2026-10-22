import {agentLaunchAllowed} from '../../lib/agent-policy.js';
import {cookieValue,deviceCookie,ticketCookie,createSessionTicket,newDevice} from '../../lib/agent-device.js';
import {reserveBrowserBudget} from '../../lib/agent-budget.js';
import {startCloudBrowser,releaseCloudBrowser} from '../../lib/browserbase-sessions.js';
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
 if(!agentLaunchAllowed())return res.status(503).json({error:'Browser-Anmeldung ist noch nicht freigeschaltet.'});
 let device=cookieValue(req,COOKIE);
 if(!VALID.test(device))device=newDevice();
 const reserved=await reserveBrowserBudget({deviceId:device});
 if(!reserved)return res.status(429).json({error:'Browser momentan nicht verfügbar. Bitte später erneut versuchen.'});
 let session;
 try{
  session=await startCloudBrowser();
  const ticket=createSessionTicket({sessionId:session.sessionId,deviceId:device,secret:process.env.FAMBO_AGENT_SIGNING_KEY});
  res.setHeader('Set-Cookie',[deviceCookie(device),ticketCookie(ticket)]);
  return res.status(201).json({status:'created'});
 }catch{
  // Reservation remains consumed to prevent unlimited retries when upstream fails.
  if(session?.sessionId)try{await releaseCloudBrowser(session.sessionId)}catch{}
  return res.status(502).json({error:'Browser konnte nicht gestartet werden.'});
 }
}
