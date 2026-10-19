import {parseUntisUrl,mondayISO,normalizeTimetable} from '../lib.js';
// Requests are bound to an authenticated user's stored timetable; never accept arbitrary target URL.
export default async function handler(req,res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!base||!key)return res.status(503).json({error:'Anmeldung noch nicht eingerichtet'});
 const bearer=String(req.headers?.authorization||'');
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(bearer))return res.status(401).json({error:'Bitte anmelden'});
 const jwt=bearer.slice(7);
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
  const upstream=await fetch(`${detail.origin}/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=${encodeURIComponent(detail.entityId)}&date=${day}&formatId=1`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!upstream.ok)return res.status(502).json({error:`WebUntis antwortet mit Status ${upstream.status}`});
  const lessons=normalizeTimetable(await upstream.json());
  return res.status(200).json({lessons,week:day});
 }catch{return res.status(502).json({error:'Stundenplan momentan nicht verfügbar'})}
}
