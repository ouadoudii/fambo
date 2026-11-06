const LIMIT=1024*1024;
export function validIcalUrl(raw){
 let u;try{u=new URL(raw)}catch{return false}
 return u.protocol==='https:' && !u.username && !u.password && (u.hostname==='webuntis.com'||u.hostname.endsWith('.webuntis.com')) && u.port==='' && raw.length<=1600;
}
function unescapeText(v){return v.replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim().slice(0,100)}
function berlinDate(v,params=''){
 const z=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
 if(!z)return null;
 const date=z[1]+'-'+z[2]+'-'+z[3];
 if(!z[4])return {date,start:'00:00'};
 if(v.endsWith('Z')){
  const d=new Date(Date.UTC(+z[1],+z[2]-1,+z[3],+z[4],+z[5],+(z[6]||0)));
  if(Number.isNaN(d.valueOf()))return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const get=k=>parts.find(p=>p.type===k)?.value;
  return {date:get('year')+'-'+get('month')+'-'+get('day'),start:get('hour')+':'+get('minute')};
 }
 // Local WebUntis timestamps are calendar wall times; do not apply server timezone.
 return {date,start:z[4]+':'+z[5]};
}
export function parseIcal(input){
 if(typeof input!=='string'||input.length>LIMIT||!input.includes('BEGIN:VCALENDAR'))throw Error('Ungültige Kalenderdatei');
 const lines=input.replace(/\r\n?/g,'\n').split('\n');
 const unfolded=[];
 for(const l of lines){if(/^[ \t]/.test(l)&&unfolded.length)unfolded[unfolded.length-1]+=l.slice(1);else unfolded.push(l)}
 const lessons=[];let event=null;
 for(const line of unfolded){
  if(line==='BEGIN:VEVENT'){event={};continue}
  if(line==='END:VEVENT'){
   if(event){
    const start=berlinDate(event.DTSTART?.value||'',event.DTSTART?.params);
    const end=berlinDate(event.DTEND?.value||'',event.DTEND?.params);
    if(start && /^\d{4}-\d{2}-\d{2}$/.test(start.date) && lessons.length<500){
     lessons.push({id:String(lessons.length),date:start.date,start:start.start,end:end?.date===start.date?end.start:'',subject:unescapeText(event.SUMMARY?.value||'Unterricht')||'Unterricht',room:unescapeText(event.LOCATION?.value||''),cancelled:event.STATUS?.value==='CANCELLED'});
    }
   }
   event=null;continue;
  }
  if(!event)continue;
  const i=line.indexOf(':');if(i<0)continue;
  const head=line.slice(0,i).split(';');const key=head[0].toUpperCase();
  if(['DTSTART','DTEND','SUMMARY','LOCATION','STATUS'].includes(key))event[key]={value:line.slice(i+1),params:head.slice(1).join(';')};
 }
 return lessons.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,500);
}
export async function fetchIcal(raw,{fetcher=fetch}={}){
 if(!validIcalUrl(raw))throw Error('Nur HTTPS-iCal-Links von WebUntis sind erlaubt');
 const res=await fetcher(raw,{redirect:'manual',headers:{Accept:'text/calendar'},signal:AbortSignal.timeout(10000)});
 if(!res.ok||res.status>=300&&res.status<400)throw Error('WebUntis-Kalender konnte nicht abgerufen werden');
 if(Number(res.headers.get('content-length'))>LIMIT)throw Error('Kalenderdatei zu groß');
 const reader=res.body?.getReader();
 if(!reader)throw Error('Leere Kalenderantwort');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT)throw Error('Kalenderdatei zu groß');chunks.push(value)}}finally{reader.releaseLock()}
 const merged=new Uint8Array(size);let offset=0;
 for(const c of chunks){merged.set(c,offset);offset+=c.length}
 return parseIcal(new TextDecoder().decode(merged));
}
