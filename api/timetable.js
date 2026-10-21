import {parseUntisUrl,mondayISO,normalizeTimetable} from '../lib.js';
import {publicTimetable} from '../webuntis.js';
// Requests are bound to an authenticated user's stored timetable; never accept arbitrary target URL.
export default async function handler(req,res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!base||!key)return res.status(503).json({error:'Anmeldung noch nicht eingerichtet'});
 const bearer=String(req.headers?.authorization||'');
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(bearer))return res.status(401).json({error:'Bitte anmelden'});
 const jwt=bearer.slice(7);
 const pieces=jwt.split('.');
 try {
  if(pieces.length!==3||pieces.some(part=>!part))throw Error('Invalid JWT');
  const header=JSON.parse(Buffer.from(pieces[0],'base64url').toString('utf8'));
  const claims=JSON.parse(Buffer.from(pieces[1],'base64url').toString('utf8'));
  if(!header||typeof header.alg!=='string'||!claims||!(/^[0-9a-f-]{36}$/i).test(claims.sub||''))throw Error('Invalid JWT');
 }catch{return res.status(401).json({error:'Ungültige Sitzung'})}
 let day,slot;try{day=mondayISO(String(req.query?.date||''));slot=Number(req.query?.slot);if(!Number.isInteger(slot)||slot<0||slot>1)throw Error('Ungültiger Stundenplan')}catch{return res.status(400).json({error:'Ungültige Anfrage'})}
 try{
  const auth=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${jwt}`},signal:AbortSignal.timeout(6000)});
  if(!auth.ok)return res.status(401).json({error:'Sitzung abgelaufen'});
  const user=await auth.json();
  if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return res.status(401).json({error:'Ungültige Sitzung'});
  const db=await fetch(`${base}/rest/v1/family_plans?select=children&user_id=eq.${encodeURIComponent(user.id)}`,{headers:{apikey:key,Authorization:`Bearer ${jwt}`},signal:AbortSignal.timeout(6000)});
  if(!db.ok)return res.status(502).json({error:'Private Familiendaten konnten nicht geladen werden'});
  const rows=await db.json();
  const calendar=rows[0]?.children?.[slot];
  if(!calendar?.url)return res.status(404).json({error:'Für dieses Kind wurde noch kein Stundenplan hinterlegt'});
  const detail=parseUntisUrl(calendar.url);
  const lessons=normalizeTimetable(await publicTimetable(detail,day));
  return res.status(200).json({lessons,week:day});
 }catch(error){
  const message=String(error?.message||'');
  if(message.includes('ohne Schul-Anmeldung'))return res.status(403).json({error:message});
  return res.status(502).json({error:'Stundenplan momentan nicht verfügbar'});
 }
}
