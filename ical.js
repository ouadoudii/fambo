const MAX_BYTES=2_000_000;
export function parseIcalUrl(value){
 let url;
 try{url=new URL(value)}catch{throw Error('Bitte einen vollständigen iCal-Link eingeben.')}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!/^[a-z0-9-]+\.webuntis\.com$/i.test(url.hostname)||!/\/WebUntis\/Ical\.do$/i.test(url.pathname)||!url.searchParams.get('token'))throw Error('Bitte den persönlichen iCal-Abolink aus WebUntis verwenden.');
 return url.toString();
}
const unescapeText=value=>String(value||'').replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1').trim();
function parseTime(value,timezone){
 const raw=String(value||'').trim();
 if(!/^\d{8}T\d{6}Z?$/.test(raw))return null;
 const date=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8);
 let hour=raw.slice(9,11),minute=raw.slice(11,13);
 if(raw.endsWith('Z')){
  const dt=new Date(raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8)+'T'+hour+':'+minute+':'+raw.slice(13,15)+'Z');
  try{
   const chunks=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(dt);
   const values=Object.fromEntries(chunks.map(x=>[x.type,x.value]));
   return {date:values.year+'-'+values.month+'-'+values.day,time:values.hour+':'+values.minute};
  }catch{return null}
 }
 if(timezone && !/^(Europe\/(Berlin|Vienna|Zurich)|W\. Europe Standard Time)$/i.test(timezone))return null;
 return {date,time:hour+':'+minute};
}
export function parseIcal(ics,week){
 if(typeof ics!=='string'||ics.length>MAX_BYTES||!ics.includes('BEGIN:VCALENDAR'))throw Error('WebUntis hat keinen gültigen Kalender geliefert.');
 const lines=ics.replace(/\r\n/g,'\n').split('\n');
 const unfolded=[];
 for(const line of lines){if(/^[ \t]/.test(line)&&unfolded.length)unfolded[unfolded.length-1]+=line.slice(1);else unfolded.push(line)}
 const lessons=[];let event=null;
 for(const line of unfolded){
  if(line==='BEGIN:VEVENT'){event={};continue}
  if(line==='END:VEVENT'){
   if(event){
    const a=parseTime(event.DTSTART?.value,event.DTSTART?.timezone),b=parseTime(event.DTEND?.value,event.DTEND?.timezone);
    if(a&&b&&a.date>=week&&a.date<=weekEnd(week)){
     const subject=unescapeText(event.SUMMARY?.value)||'Unterricht';
     lessons.push({id:String(event.UID?.value||a.date+a.time+subject).slice(0,150),date:a.date,start:a.time,end:b.time,subject:subject.slice(0,120),room:unescapeText(event.LOCATION?.value).slice(0,100),cancelled:String(event.STATUS?.value||'').toUpperCase()==='CANCELLED'||/entfällt|ausfall|cancelled/i.test(subject)});
    }
   }
   event=null;continue;
  }
  if(!event)continue;
  const colon=line.indexOf(':');if(colon<0)continue;
  const namePart=line.slice(0,colon);
  const name=namePart.split(';')[0].toUpperCase();
  if(!/^(DTSTART|DTEND|SUMMARY|LOCATION|UID|STATUS)$/.test(name))continue;
  const timezone=/TZID=([^;:]+)/i.exec(namePart)?.[1];
  event[name]={value:line.slice(colon+1),timezone:timezone?timezone.replace(/^"|"$/g,''):''};
 }
 return lessons.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(row=>({
  ...row,subject:row.subject||'Unterricht'
 }));
}
function weekEnd(week){const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10)}
export async function fetchIcalTimetable(url,week,{fetcher=fetch}={}){
 const target=parseIcalUrl(url);
 const response=await fetcher(target,{headers:{Accept:'text/calendar'},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('WebUntis iCal-Abo nicht erreichbar ('+response.status+').');
 if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw Error('Kalender ist zu groß.');
 const body=await response.text();
 return parseIcal(body,week);
}
