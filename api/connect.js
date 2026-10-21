import {parseUntisUrl,mondayISO,normalizeTimetable} from '../lib.js';
import {publicTimetable} from '../webuntis.js';

// Stateless bridge: a user-supplied public WebUntis link is used for this request only.
// No family record, cookie, timetable or link is stored on the server.
export default async function handler(req,res) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
 if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))return res.status(415).json({error:'JSON erforderlich'});
 let detail,week;
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||typeof body.url!=='string'||body.url.length>1500||typeof body.date!=='string')throw Error('invalid');
  detail=parseUntisUrl(body.url);
  week=mondayISO(body.date);
 }catch{return res.status(400).json({error:'Bitte einen gültigen öffentlichen WebUntis-Link und ein Datum eingeben.'})}
 try{
  const lessons=normalizeTimetable(await publicTimetable(detail,week));
  return res.status(200).json({week,lessons});
 }catch(error){
  const message=String(error?.message||'');
  if(message.includes('ohne Schul-Anmeldung')||message.includes('Zugriff auf den Stundenplan abgelehnt'))return res.status(403).json({error:'Dieser WebUntis-Stundenplan ist nicht öffentlich abrufbar. Prüfe die Freigabe in WebUntis.'});
  return res.status(502).json({error:'WebUntis konnte den Stundenplan nicht liefern. Bitte später erneut versuchen.'});
 }
}
