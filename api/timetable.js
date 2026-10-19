import {parseUntisUrl,mondayISO,normalizeTimetable} from '../lib.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, max-age=0, s-maxage=120');
  if(req.method!=='GET') return res.status(405).json({error:'Methode nicht erlaubt'});
  let detail; let date;
  try { detail=parseUntisUrl(String(req.query.url||'')); date=mondayISO(String(req.query.date||'')); }
  catch(e) { return res.status(400).json({error:e.message}); }
  const endpoint = `${detail.origin}/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=${encodeURIComponent(detail.entityId)}&date=${date}&formatId=1`;
  try {
    const upstream=await fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!upstream.ok) return res.status(502).json({error:`WebUntis antwortet mit Status ${upstream.status}. Eventuell sind öffentliche Schülerdaten nicht über die Schnittstelle verfügbar.`});
    const raw=await upstream.json();
    const lessons=normalizeTimetable(raw);
    return res.status(200).json({lessons,week:date});
  } catch {return res.status(502).json({error:'Der Stundenplan konnte nicht geladen werden. Prüfe den öffentlichen Link oder versuche es später erneut.'});}
}
