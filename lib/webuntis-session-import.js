/**
 * Read-only inspection of an authenticated WebUntis page using Cloudflare Browser Run CDP.
 * Never returns DOM markup, cookies, tokens, or personal account information.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeWebUntisHost(value){
 try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='webuntis.com'||u.hostname.endsWith('.webuntis.com'))&&!!u.hostname&&u.username===''&&u.password==='';}catch{return false}
}
export function normalizeSessionLessons(input){
 if(!Array.isArray(input))return [];
 return input.slice(0,200).flatMap((x,i)=>{
  if(!x||typeof x!=='object'||typeof x.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!/^\d{2}:\d{2}$/.test(x.start||''))return [];
  const txt=v=>typeof v==='string'?v.trim().slice(0,100):'';
  return [{id:String(i),date:x.date,start:x.start,end:/^\d{2}:\d{2}$/.test(x.end||'')?x.end:'',subject:txt(x.subject)||'Unterricht',room:txt(x.room),cancelled:x.cancelled===true}];
 });
}
const INSPECT=`(()=>{
 if(location.protocol!=='https:'||!(location.hostname==='webuntis.com'||location.hostname.endsWith('.webuntis.com')))return {ok:false,reason:'wrong_site'};
 const pick=(el,selectors)=>selectors.map(s=>el.querySelector(s)?.textContent?.trim()).find(Boolean)||'';
 const get=(el,attrs)=>attrs.map(k=>el.getAttribute(k)).find(Boolean)||'';
 const isoDate=v=>{
  v=String(v||'').trim();
  if(/^\\d{4}-\\d{2}-\\d{2}$/.test(v))return v;
  const m=v.match(/^(\\d{1,2})[.\\/](\\d{1,2})[.\\/](\\d{4})$/);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
 };
 const clock=v=>{
  v=String(v||'').trim();
  const m=v.match(/(?:^|\\s)(\\d{1,2})[:.](\\d{2})(?:\\s|$)/);
  return m&&Number(m[1])<24&&Number(m[2])<60?m[1].padStart(2,'0')+':'+m[2]:'';
 };
 const selectors='[data-date][data-start], [data-lesson-date], .timetable-entry, [data-testid*="lesson"], [data-testid*="period"], .lesson-entry, .lesson, .tt-cell, .timetable-cell';
 const entries=[...document.querySelectorAll(selectors)].filter(el=>!el.querySelector(selectors)).slice(0,200);
 const lessons=entries.map(el=>{
  const closestDate=el.closest('[data-date], [data-day], [data-lesson-date]');
  const date=isoDate(get(el,['data-date','data-lesson-date','data-day'])||get(closestDate||el,['data-date','data-lesson-date','data-day'])||el.querySelector('time[datetime]')?.getAttribute('datetime')?.slice(0,10));
  const time=pick(el,['.time','.lesson-time','[data-testid*="time"]','time']);
  const times=time.match(/\\d{1,2}[:.]\\d{2}/g)||[];
  return {
   date,
   start:clock(get(el,['data-start','data-start-time','data-begin'])||times[0]),
   end:clock(get(el,['data-end','data-end-time'])||times[1]),
   subject:pick(el,['.subject','.lesson-subject','[data-subject]','[data-testid*="subject"]'])||get(el,['data-subject']),
   room:pick(el,['.room','.lesson-room','[data-room]','[data-testid*="room"]'])||get(el,['data-room']),
   cancelled:el.classList.contains('cancelled')||el.classList.contains('canceled')
  };
 });
 return {ok:true,lessons};
})()`;
export async function inspectSession({binding,sessionId,sendCommand}){
 if(!UUID.test(sessionId))throw Error('Ungültige Sitzung');
 if(!binding||typeof binding.devtools?.listTargets!=='function')throw Error('Browser Run nicht bereit');
 const targets=await binding.devtools.listTargets(sessionId);
 const page=targets.find(t=>t.type==='page'&&safeWebUntisHost(t.url));
 if(!page)return {status:'wrong_site',lessons:[]};
 const result=await sendCommand(binding,sessionId,page.id,INSPECT);
 if(result?.ok!==true)return {status:'wrong_site',lessons:[]};
 const lessons=normalizeSessionLessons(result.lessons);
 return {status:lessons.length?'ready':'unsupported_layout',lessons};
}
export async function evaluateReadOnly(binding,sessionId,targetId,expression){
 const connection=await binding.connectSession(sessionId,{targetId});
 const response=await connection.webSocket.fetch('https://browser-binding.invalid',{headers:{Upgrade:'websocket'}});
 const ws=response.webSocket;
 if(!ws)throw Error('Keine Browserverbindung');
 ws.accept();
 try{
  return await new Promise((resolve,reject)=>{
   const id=1;
   const timeout=setTimeout(()=>reject(Error('Auslesen hat zu lange gedauert')),8000);
   ws.addEventListener('message',event=>{
    let msg;try{msg=JSON.parse(event.data)}catch{return}
    if(msg.id!==id)return;
    clearTimeout(timeout);
    if(msg.error||msg.result?.exceptionDetails)reject(Error('Stundenplan konnte nicht ausgelesen werden'));
    else resolve(msg.result?.result?.value);
   });
   ws.addEventListener('close',()=>{clearTimeout(timeout);reject(Error('Browserverbindung beendet'))});
   ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:false}}));
  });
 }finally{ws.close()}
}
