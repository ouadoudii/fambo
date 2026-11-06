import {fetchIcal} from '../lib/ical.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
 if(!String(req.headers?.['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'JSON erforderlich'});
 const data=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():req.body;
 if(!data||typeof data.url!=='string')return res.status(400).json({error:'iCal-Link fehlt'});
 try{
  const lessons=await fetchIcal(data.url);
  return res.status(200).json({lessons});
 }catch(error){
  const msg=String(error?.message||'');
  return res.status(msg.includes('erlaubt')?400:502).json({error:msg.includes('Kalender')||msg.includes('erlaubt')?msg:'Der iCal-Kalender konnte nicht geladen werden.'});
 }
}
