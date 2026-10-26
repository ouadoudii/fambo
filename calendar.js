/** Private, read-only Google Calendar display. OAuth tokens are memory-only. */
const button=document.getElementById('calendar-connect');
const stop=document.getElementById('calendar-disconnect');
const status=document.getElementById('calendar-status');
const eventsRoot=document.getElementById('calendar-events');
let accessToken=null, tokenClient=null, generation=0;
const tell=message=>{status.textContent=message};
const script=()=>new Promise((resolve,reject)=>{
 if(window.google?.accounts?.oauth2)return resolve();
 const el=document.createElement('script');
 el.src='https://accounts.google.com/gsi/client';el.async=true;
 el.onload=()=>window.google?.accounts?.oauth2?resolve():reject(Error('Google-Anmeldung konnte nicht geladen werden.'));
 el.onerror=()=>reject(Error('Google-Anmeldung konnte nicht geladen werden.'));
 document.head.append(el);
});
async function googleGet(path,token){
 const response=await fetch('https://www.googleapis.com/calendar/v3/'+path,{
  headers:{Authorization:'Bearer '+token},cache:'no-store'});
 if(!response.ok)throw Error(response.status===401?'Google-Sitzung abgelaufen. Bitte erneut verbinden.':'Kalender konnten nicht geladen werden.');
 return response.json();
}
function showEvents(items){
 eventsRoot.replaceChildren();
 if(!items.length){eventsRoot.textContent='Keine Termine in den nächsten 14 Tagen.';return}
 for(const item of items.slice(0,45)){
  const row=document.createElement('div');row.className='calendar-event';
  const when=document.createElement('time');
  const begin=item.start?.dateTime||item.start?.date;
  const parsed=new Date(begin);
  when.textContent=Number.isNaN(parsed.valueOf())?'Termin':new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:item.start?.dateTime?'2-digit':undefined,minute:item.start?.dateTime?'2-digit':undefined,timeZone:'Europe/Zurich'}).format(parsed);
  const title=document.createElement('strong');title.textContent=String(item.summary||'Termin').slice(0,140);
  row.append(when,title);eventsRoot.append(row);
 }
}
async function loadEvents(token){
 const version=++generation;
 tell('Private Termine werden geladen …');
 try{
  const calendars=await googleGet('users/me/calendarList?minAccessRole=reader&maxResults=100',token);
  const now=new Date(),end=new Date(now.getTime()+14*86400000);
  const selected=(calendars.items||[]).filter(x=>x.selected!==false&&x.hidden!==true).slice(0,10);
  const lists=await Promise.all(selected.map(async calendar=>{
   const params=new URLSearchParams({timeMin:now.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'100'});
   return googleGet('calendars/'+encodeURIComponent(calendar.id)+'/events?'+params,token);
  }));
  if(version!==generation)return;
  const unique=new Map();
  for(const list of lists)for(const event of list.items||[]){
   if(event.status==='cancelled')continue;
   const k=(event.iCalUID||event.id)+'|'+(event.start?.dateTime||event.start?.date||'');
   if(!unique.has(k))unique.set(k,event);
  }
  const events=[...unique.values()].sort((a,b)=>String(a.start?.dateTime||a.start?.date).localeCompare(String(b.start?.dateTime||b.start?.date)));
  showEvents(events);tell(selected.length+' Kalender verbunden · '+events.length+' Termine in den nächsten 14 Tagen.');
 }catch(error){if(version===generation){eventsRoot.replaceChildren();tell(error.message)}}
}
button?.addEventListener('click',async()=>{
 button.disabled=true;tell('Google-Anmeldung wird vorbereitet …');
 try{
  const res=await fetch('/api/calendar/config',{cache:'no-store'});
  if(!res.ok)throw Error('Google-Anbindung ist in Fambo noch nicht eingerichtet.');
  const {clientId}=await res.json();
  if(!/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Google-Konfiguration ungültig.');
  await script();
  tokenClient=google.accounts.oauth2.initTokenClient({
   client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.readonly',
   callback:response=>{
    button.disabled=false;
    if(response.error||!response.access_token){tell('Google-Verbindung wurde nicht bestätigt.');return}
    accessToken=response.access_token;button.textContent='Termine aktualisieren';stop.hidden=false;
    loadEvents(accessToken);
   },
   error_callback:()=>{button.disabled=false;tell('Google-Anmeldung abgebrochen oder blockiert.')}
  });
  tokenClient.requestAccessToken({prompt:accessToken?'':'consent'});
 }catch(error){tell(error.message);button.disabled=false}
});
stop?.addEventListener('click',()=>{
 generation++;
 if(accessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(accessToken,()=>{});
 accessToken=null;tokenClient=null;
 eventsRoot.replaceChildren();stop.hidden=true;button.textContent='Google-Kalender verbinden';button.disabled=false;tell('Kalender auf diesem Gerät getrennt.');
});
