import {mondayISO,parseUntisUrl} from './lib.js';
const KEY='fambo.device.links.v1';
const $=id=>document.getElementById(id);
const defaultSlots=()=>[{name:'Kind 1',url:''},{name:'Kind 2',url:''}];
const restore=()=>{try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(!Array.isArray(data)||data.length!==2) return defaultSlots();return data.map((x,i)=>{try{if(typeof x.url!=='string'||typeof x.name!=='string'||x.name.length>30)throw Error('invalid');if(x.url)parseUntisUrl(x.url);return {name:x.name.trim()||'Kind '+(i+1),url:x.url}}catch{return defaultSlots()[i]}})}catch{return defaultSlots()}};
let children=restore();
let editing=0,revision=0;
const current=new Date();
let week=mondayISO([current.getFullYear(),String(current.getMonth()+1).padStart(2,'0'),String(current.getDate()).padStart(2,'0')].join('-'));
const dateShort=x=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(x+'T12:00:00Z'));
const offset=(iso,number)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+number);return d.toISOString().slice(0,10)};
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el};
function clock(){const d=new Date();$('clock').textContent=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(d);$('day-label').textContent=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function save(){localStorage.setItem(KEY,JSON.stringify(children))}
function openEditor(index){editing=index;const child=children[index];$('child-name').value=child.name;$('child-url').value=child.url;$('form-error').textContent='';$('remove-connection').hidden=!child.url;$('connection-dialog').showModal()}
function showLessons(root,lessons){root.replaceChildren();const days=text('div','','days');const today=new Date().toISOString().slice(0,10);for(let i=0;i<5;i++){const day=offset(week,i),col=text('div','','day'+(day===today?' active':''));col.append(text('div',['Mo','Di','Mi','Do','Fr'][i]+' '+dateShort(day),'day-title'));const rows=lessons.filter(x=>x.date===day);if(!rows.length)col.append(text('p','–','empty'));for(const p of rows){const item=text('div','','lesson'+(p.cancelled?' cancelled':''));item.append(text('b',p.subject),text('small',p.start+(p.end?'–'+p.end:'')+(p.room?' · '+p.room:'')));col.append(item)}days.append(col)}root.append(days)}
async function load(index,container,child,renderVersion){
 try{
  const response=await fetch('/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:child.url,date:week}),cache:'no-store'});
  const body=await response.json();
  if(renderVersion!==revision)return;
  if(!response.ok)throw Error(body.error||'Der Stundenplan konnte nicht geladen werden.');
  showLessons(container,body.lessons);
 }catch(error){
  if(renderVersion!==revision)return;
  container.replaceChildren();
  const notice=text('div','','state');notice.append(text('strong','Stundenplan momentan nicht verfügbar'),text('p',error.message));
  const retry=text('button','Erneut versuchen','retry');retry.onclick=()=>render();notice.append(retry);container.append(notice);
 }
}
function render(){const version=++revision;$('week-label').textContent=dateShort(week)+' – '+dateShort(offset(week,6));$('schedules').replaceChildren();children.forEach((child,index)=>{
 const card=text('article','','schedule');const head=text('div','','schedule-head');head.append(text('span',index===0?'☀':'✿','avatar'));const title=text('div','');title.append(text('h2',child.url?child.name:'Stundenplan '+(index+1)),text('div',child.url?'WebUntis verbunden':'Noch nicht verbunden','small'));head.append(title);card.append(head);
 const panel=text('div','','card-content');card.append(panel);
 if(!child.url){const empty=text('div','','connect-empty');empty.append(text('div','✺','connect-mark'),text('strong','Dein Stundenplan beginnt hier'),text('p','Verbinde WebUntis und sieh deinen Stundenplan direkt auf dieser Familienwand.'));const button=text('button','WebUntis verbinden','primary');button.onclick=()=>openEditor(index);empty.append(button);panel.append(empty)}
 else{panel.append(text('div','Stundenplan wird geladen …','state'));load(index,panel,child,version);const change=text('button','Verbindung verwalten','manage-link');change.onclick=()=>openEditor(index);card.append(change)}
 $('schedules').append(card);
})}
$('previous').onclick=()=>{week=offset(week,-7);render()};
$('next').onclick=()=>{week=offset(week,7);render()};
$('today').onclick=()=>{const d=new Date();week=mondayISO([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));render()};
$('close-dialog').onclick=()=>$('connection-dialog').close();
$('connection-form').onsubmit=event=>{event.preventDefault();const name=$('child-name').value.trim(),url=$('child-url').value.trim();try{if(!name)throw Error('Bitte einen Namen eingeben.');parseUntisUrl(url);children[editing]={name,url};save();$('connection-dialog').close();render()}catch(error){$('form-error').textContent=error.message}};
$('remove-connection').onclick=()=>{children[editing]=defaultSlots()[editing];save();$('connection-dialog').close();render()};

let cloudUrl='';
async function cloudRequest(path,options){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const err=Error(body.error||'Verbindung derzeit nicht verfügbar.');err.reason=body.reason;err.httpStatus=response.status;throw err;}
 return body;
}
const cloudMessage=value=>{$('cloud-status').textContent=value};
async function refreshCloud(){
 $('cloud-start').disabled=true;
 try{
  const status=await cloudRequest('/api/agent/status');
  $('cloud-start').disabled=!status.available;
  cloudMessage(status.available?'Bereit für eine geschützte Browser-Sitzung.':'Cloud-Browser momentan noch nicht verfügbar.');
 }catch{cloudMessage('Cloud-Browser momentan noch nicht verfügbar.')}
}
$('cloud-start').onclick=async()=>{
 $('cloud-start').disabled=true;
 cloudMessage('Geschützter Browser wird gestartet …');
 try{
  await cloudRequest('/api/agent/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const session=await cloudRequest('/api/agent/session');
  const url=new URL(session.viewer);
  if(url.protocol!=='https:'||!(url.hostname==='live.browser.run'||url.hostname==='browserbase.com'||url.hostname.endsWith('.browserbase.com')))throw Error('Ungültige Browser-Adresse');
  cloudUrl=url.href;
  $('cloud-viewer').href=cloudUrl;
  $('cloud-viewer').hidden=false;
  $('cloud-stop').hidden=false;
  cloudMessage('Browser bereit. Öffne ihn, wähle deine Schule und melde dich direkt bei WebUntis an.');
 }catch(err){
  const hints={
   authentication:'Browserbase-Anmeldung abgelehnt. API-Key prüfen.',
   billing:'Browserbase-Guthaben oder Abrechnung prüfen.',
   quota:'Browserbase-Sitzungslimit erreicht.',
   provider_unavailable:'Browserbase ist derzeit nicht erreichbar.',
   request_rejected:'Browserbase hat die Sitzungserstellung abgelehnt.',
   upstream_redirect:'Browserbase-Weiterleitung aus Sicherheitsgründen blockiert.',
   session_setup_failed:'Browser-Sitzung konnte nicht eingerichtet werden.',
   budget_busy:'Eine Sitzung ist noch reserviert. Bitte nach Ablauf der 15-Minuten-Sperre erneut versuchen.',
   daily_limit:'Das Tageslimit für Cloud-Browser wurde erreicht.',
   device_limit:'Das Tageslimit dieses Browsers wurde erreicht.',
   budget_unavailable:'Die sichere Sitzungsbegrenzung (Redis) ist derzeit nicht erreichbar.'
  };
  const reason=Object.hasOwn(hints,err.reason)?hints[err.reason]:(err.message||'Browser konnte nicht gestartet werden.');
  $('cloud-viewer').hidden=true;
  $('cloud-stop').hidden=true;
  cloudUrl='';
  await refreshCloud();
  cloudMessage(reason);
 }
};
$('cloud-stop').onclick=async()=>{
 $('cloud-stop').disabled=true;
 try{
  await cloudRequest('/api/agent/session',{method:'DELETE',headers:{'Content-Type':'application/json'}});
  cloudMessage('Browser-Sitzung beendet.');
 }catch(err){cloudMessage(err.message||'Sitzung konnte nicht beendet werden.')}
 finally{
  cloudUrl='';
  $('cloud-viewer').href='#';
  $('cloud-viewer').hidden=true;
  $('cloud-stop').hidden=true;
  $('cloud-stop').disabled=false;
  await refreshCloud();
 }
};
refreshCloud();

clock();setInterval(clock,30000);setInterval(()=>{if(!$('connection-dialog').open&&children.some(x=>x.url))render()},300000);render();
