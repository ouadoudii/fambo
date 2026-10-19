import {parseUntisUrl,mondayISO} from './lib.js';
import {initAuth,currentUser,signIn,signUp,signOut,token,loadFamily,saveFamily} from './auth.js';
const INITIAL=[{name:'Kind 1',url:''},{name:'Kind 2',url:''}];
const $=id=>document.getElementById(id);
const d=new Date(); let week=mondayISO([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));
let children=INITIAL;
const dateShort=x=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(`${x}T12:00:00Z`));
const dateLong=x=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(x);
const mondayOffset=(iso,offset)=>{let d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el};
function updateClock(){const now=new Date();$('clock').textContent=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(now);$('day-label').textContent=dateLong(now);}
updateClock();setInterval(updateClock,30000);
function renderCard(child,index){const card=text('article','','schedule');const head=text('div','','schedule-head');head.append(text('span',index===0?'☀':'✿','avatar'));const headings=text('div','');headings.append(text('h2',child.name),text('div','Stundenplan · WebUntis','small'));head.append(headings);card.append(head);const content=text('div','','card-content');content.append(text('div','Stundenplan wird geladen …','state'));card.append(content);return {card,content};}
function showMessage(root,heading,message,url,button){root.replaceChildren();const box=text('div','','state');box.append(text('strong',heading),text('p',message));if(url){const a=text('a','In WebUntis öffnen');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}if(button){const b=text('button',button,'retry');b.addEventListener('click',()=>{$('settings-dialog').showModal()});box.append(b)}root.append(box);}
function showLessons(root,lessons){root.replaceChildren();const days=text('div','','days');const now=new Date().toISOString().slice(0,10);for(let i=0;i<5;i++){const date=mondayOffset(week,i),col=text('div','','day'+(date===now?' active':''));col.append(text('div',['Mo','Di','Mi','Do','Fr'][i]+' '+dateShort(date),'day-title'));const rows=lessons.filter(p=>p.date===date);if(!rows.length)col.append(text('p','–','empty'));rows.forEach(p=>{const item=text('div','','lesson'+(p.cancelled?' cancelled':''));item.append(text('b',p.subject),text('small',p.start+(p.end?'–'+p.end:'')+(p.room?' · '+p.room:'')));col.append(item)});days.append(col)}root.append(days);}
let renderId=0;
async function render(){if(!currentUser())return;const current=++renderId;$('week-label').textContent=`${dateShort(week)} – ${dateShort(mondayOffset(week,6))}`;$('schedules').replaceChildren();for (let i=0;i<children.length;i++){const child=children[i];const {card,content}=renderCard(child,i);$('schedules').append(card);if(!child.url){showMessage(content,'Noch kein Stundenplan','Füge den öffentlichen WebUntis-Link hinzu.',null,'Link eintragen');continue;}try{parseUntisUrl(child.url);const jwt=await token();const response=await fetch(`/api/timetable?slot=${i}&date=${week}`,{headers:{Authorization:`Bearer ${jwt}`},cache:'no-store'});const payload=await response.json();if(current!==renderId)return;if(!response.ok)throw Error(payload.error||'Unbekannter Fehler');showLessons(content,payload.lessons);}catch(error){if(current!==renderId)return;showMessage(content,'Stundenplan nicht verfügbar',error.message,child.url,'Link prüfen');}}}
$('previous').onclick=()=>{week=mondayOffset(week,-7);render()};$('next').onclick=()=>{week=mondayOffset(week,7);render()};$('today').onclick=()=>{const n=new Date();week=mondayISO([n.getFullYear(),String(n.getMonth()+1).padStart(2,'0'),String(n.getDate()).padStart(2,'0')].join('-'));render()};
$('settings').onclick=()=>{$('settings-dialog').showModal()};
const form=$('settings-form');function fill(){children.forEach((c,i)=>{form.elements[`name${i}`].value=c.name;form.elements[`url${i}`].value=c.url})}fill();
form.addEventListener('submit',async event=>{if(event.submitter?.value!=='save')return;event.preventDefault();const next=[0,1].map(i=>({name:form.elements[`name${i}`].value.trim(),url:form.elements[`url${i}`].value.trim()}));try{next.forEach(c=>{if(!c.name)throw Error('Bitte beide Namen eintragen.');if(c.url)parseUntisUrl(c.url)});await saveFamily(next);children=next;$('form-error').textContent='';$('settings-dialog').close();render();}catch(e){$('form-error').textContent=e.message;}});
let registration=false;
function showAuth(message=''){$('auth-view').hidden=false;$('dashboard').hidden=true;$('auth-error').textContent=message;}
async function showDashboard() {children=await loadFamily();fill();$('auth-view').hidden=true;$('dashboard').hidden=false;await render();}
$('auth-toggle').addEventListener('click',()=>{registration=!registration;$('auth-submit').textContent=registration?'Registrieren':'Anmelden';$('auth-toggle').textContent=registration?'Bereits registriert? Anmelden':'Noch kein Konto? Registrieren';$('auth-error').textContent='';});
$('auth-form').addEventListener('submit',async event=>{
 event.preventDefault();
 $('auth-error').textContent='';
 const submit=$('auth-submit');submit.disabled=true;
 try {
  const email=$('auth-email').value.trim(),password=$('auth-password').value;
  if(registration){const result=await signUp(email,password);if(result.needsConfirmation){$('auth-error').textContent='Prüfe dein E-Mail-Postfach und bestätige dein Konto. Danach anmelden.';return;}}
  else await signIn(email,password);
  await showDashboard();
 }catch(e){$('auth-error').textContent=e.message;}
 finally{submit.disabled=false}
});
$('logout').addEventListener('click',async()=>{try{await signOut()}finally{children=INITIAL;showAuth();}});
showAuth();
initAuth().then(async user=>{if(user)await showDashboard()}).catch(e=>showAuth(e.message));
setInterval(()=>{if(currentUser()&&!$('settings-dialog').open)render()},300000);
