export function parseUntisUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Bitte einen vollständigen WebUntis-Link eingeben.'); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.webuntis.com') || url.hostname === '.webuntis.com') throw Error('Nur sichere WebUntis-Links sind erlaubt.');
  const hash = new URLSearchParams((url.hash.split('?')[1] || ''));
  const entityId = hash.get('entityId');
  if (!/^\d{1,12}$/.test(entityId || '')) throw Error('Im Link fehlt die Schüler-ID (entityId).');
  const school = url.searchParams.get('school');
  if (!school || !/^[a-z0-9-]{1,80}$/i.test(school)) throw Error('Im Link fehlt die Schule.');
  return { origin:url.origin, school, entityId };
}
export function mondayISO(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10)!==dateString) throw Error('Ungültiges Datum.');
  const weekday = date.getUTCDay(); date.setUTCDate(date.getUTCDate() - ((weekday+6)%7)); return date.toISOString().slice(0,10);
}
const clean = v=>typeof v==='string'?v.trim():'';
const timeLabel = t => /^\d{3,4}$/.test(String(t)) ? String(t).padStart(4,'0').replace(/^(\d{2})(\d{2})$/,'$1:$2') : '';
export function normalizeTimetable(payload) {
 const raw = payload?.data?.result?.data ?? payload?.data?.data ?? payload?.result?.data ?? payload?.data ?? payload;
 const periods = raw?.elementPeriods;
 if (!periods || typeof periods !== 'object') throw Error('WebUntis liefert kein bekanntes Stundenplanformat.');
 const metadata = raw?.elements || raw?.elementList || [];
 const elementName = (id) => {const entry = Array.isArray(metadata) ? metadata.find(e=>String(e.id)===String(id)) : null; return entry?.longName || entry?.name || entry?.displayName || '';};
 const arr=Object.values(periods).flatMap(x=>Array.isArray(x)?x:[]);
 return arr.map(p=>{
   const day = String(p.date || p.day || '');
   const iso = /^\d{8}$/.test(day)?`${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6)}`:day;
   const cells = p.elements || [];
   const subject = cells.find(x=>x.type===3 || x.type==='SUBJECT');
   const room = cells.find(x=>x.type===4 || x.type==='ROOM');
   return {id:String(p.id ?? `${day}-${p.startTime}-${p.endTime}`),date:iso,start:timeLabel(p.startTime),end:timeLabel(p.endTime),subject:clean(p.subject || p.subjectName || subject?.name || elementName(subject?.id) || p.lessonText || 'Unterricht'),room:clean(p.room || room?.name || elementName(room?.id)),cancelled:p.code==='cancelled'||p.isCancelled===true||p.cellState==='CANCEL'};
 }).filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.start).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
}
