import {mondayISO} from '../lib.js';
import {fetchIcalTimetable,parseIcalUrl} from '../ical.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
 if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))return res.status(415).json({error:'JSON erforderlich'});
 let url,week;
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||typeof body.url!=='string'||body.url.length>1500||typeof body.date!=='string')throw Error('invalid');
  url=parseIcalUrl(body.url);
  week=mondayISO(body.date);
 }catch{return res.status(400).json({error:'Bitte einen gültigen WebUntis-iCal-Abolink eingeben.'})}
 try{
  return res.status(200).json({week,lessons:await fetchIcalTimetable(url,week)});
 }catch{
  return res.status(502).json({error:'Der WebUntis-Kalender konnte nicht geladen werden. Bitte prüfe, ob dein iCal-Abo noch aktiv ist.'});
 }
}
