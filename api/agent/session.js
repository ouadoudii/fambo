import {cookieValue,verifySessionTicket,clearTicketCookie} from '../../lib/agent-device.js';
import {getCloudViewer,releaseCloudBrowser} from '../../lib/browserbase-sessions.js';
import {expectedOrigin} from './start.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'&&req.method!=='DELETE')return res.status(405).json({error:'Methode nicht erlaubt'});
 const origin=expectedOrigin(req);
 if(!origin||(req.headers?.['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'))return res.status(403).json({error:'Anfrage nicht erlaubt'});
 if(req.method==='DELETE'&&req.headers?.origin!==origin)return res.status(403).json({error:'Anfrage nicht erlaubt'});
 const device=cookieValue(req,'__Host-fambo_device');
 const ticket=cookieValue(req,'__Host-fambo_browser');
 if(!process.env.FAMBO_AGENT_SIGNING_KEY)return res.status(503).json({error:'Agent noch nicht eingerichtet'});
 const session=verifySessionTicket(ticket,{deviceId:device,secret:process.env.FAMBO_AGENT_SIGNING_KEY});
 if(!session)return res.status(401).json({error:'Keine gültige Browser-Sitzung auf diesem Gerät.'});
 try{
  if(req.method==='DELETE'){
   await releaseCloudBrowser(session.sessionId);
   res.setHeader('Set-Cookie',clearTicketCookie());
   return res.status(200).json({closed:true});
  }
  const viewer=await getCloudViewer(session.sessionId);
  return res.status(200).json({viewer,expiresAt:session.expiresAt});
 }catch{return res.status(502).json({error:'Browser-Sitzung momentan nicht erreichbar.'})}
}
