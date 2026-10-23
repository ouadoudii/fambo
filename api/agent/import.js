import {cookieValue,verifySessionTicket} from '../../lib/agent-device.js';
import {expectedOrigin} from './start.js';
import {inspectSession,evaluateReadOnly} from '../../lib/webuntis-session-import.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
 const origin=expectedOrigin(req);
 if(!origin||req.headers?.origin!==origin||!String(req.headers?.['content-type']||'').startsWith('application/json'))
  return res.status(403).json({error:'Anfrage nicht erlaubt'});
 const env=req.runtimeEnv||process.env;
 if(!env.BROWSER||!env.FAMBO_AGENT_SIGNING_KEY)return res.status(503).json({error:'Cloud-Browser nicht verfügbar'});
 const device=cookieValue(req,'__Host-fambo_device'),ticket=cookieValue(req,'__Host-fambo_browser');
 const session=verifySessionTicket(ticket,{deviceId:device,secret:env.FAMBO_AGENT_SIGNING_KEY});
 if(!session)return res.status(401).json({error:'Browser-Sitzung abgelaufen. Bitte erneut verbinden.'});
 try{
  const data=await inspectSession({binding:env.BROWSER,sessionId:session.sessionId,sendCommand:evaluateReadOnly});
  if(data.status==='wrong_site')return res.status(409).json({error:'Bitte im Cloud-Browser zuerst den WebUntis-Stundenplan öffnen.'});
  if(data.status!=='ready')return res.status(422).json({error:'Das Stundenplan-Layout wird noch nicht unterstützt. Es wurden keine Daten gespeichert.'});
  return res.status(200).json({lessons:data.lessons});
 }catch{return res.status(502).json({error:'Stundenplan konnte nicht aus der aktiven Sitzung gelesen werden.'})}
}
