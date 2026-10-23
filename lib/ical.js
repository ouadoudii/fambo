// WebUntis iCal subscription URLs are bearer secrets. Only allow WebUntis HTTPS origins.
export function parseIcalUrl(value){
 let url;try{url=new URL(value)}catch{throw Error('Bitte einen vollständigen WebUntis-iCal-Link einfügen.')}
 if(url.protocol!=='https:'||!(/^[a-z0-9-]+\.webuntis\.com$/i).test(url.hostname)||url.username||url.password||url.port||url.hash||value.length>1500)
  throw Error('Nur sichere WebUntis-iCal-Links sind erlaubt.');
 if(!url.pathname.toLowerCase().includes('ical')&&!url.pathname.toLowerCase().endsWith('.ics'))
  throw Error('Bitte den iCal-Abolink aus WebUntis verwenden.');
 return url.toString();
}
const unescapeText=s=>s.replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1').trim();
function dateTime(value){
 if(!/^\d{8}(T\d{6}Z?)?$/.test(value))return null;
 const d=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);
 const time=value.length>8?value.slice(9,11)+':'+value.slice(11,13):'00:00';
 if(value.endsWith('Z')){
  const timestamp=new Date(d+'T'+time+':'+value.slice(13,15)+'Z');
  if(!Number.isFinite(timestamp.valueOf()))return null;
  return {date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(timestamp)};
 }
 return {date:d,time};
}
export function parseIcal(text,week){
 if(typeof text!=='string'||!text.startsWith('BEGIN:VCALENDAR'))throw Error('Kein gültiger iCal-Kalender.');
 const lines=text.replace(/\r\n/g,'\n').split('\n').reduce((all,line)=>{if(/^[ \t]/.test(line)&&all.length)all[all.length-1]+=line.slice(1);else all.push(line);return all},[]);
 const events=[];let event=null;
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){event={};continue}
  if(line==='END:VEVENT'){if(event)events.push(event);event=null;continue}
  if(!event)continue;
  const pos=line.indexOf(':');if(pos<0)continue;
  const field=line.slice(0,pos).split(';')[0].toUpperCase(),value=line.slice(pos+1);
  if(['DTSTART','DTEND','SUMMARY','LOCATION','UID','STATUS'].includes(field))event[field]=value;
 }
 const start=new Date(week+'T00:00:00Z'),end=new Date(start.getTime()+7*86400000);
 return events.flatMap((e,i)=>{
  const a=dateTime(e.DTSTART||''),b=dateTime(e.DTEND||'');if(!a)return [];
  const day=new Date(a.date+'T00:00:00Z');if(day<start||day>=end)return [];
  return [{id:e.UID||String(i),date:a.date,start:a.time,end:b?.time||'',subject:unescapeText(e.SUMMARY||'Unterricht').slice(0,120),room:unescapeText(e.LOCATION||'').slice(0,60),cancelled:e.STATUS==='CANCELLED'}];
 }).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
}
