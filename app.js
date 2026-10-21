import {mondayISO} from './lib.js';
import {DEMO_CHILDREN,demoLessons} from './demo.js';
// No login or family data is loaded. Any authenticated legacy API remains protected server-side.
const INITIAL=[{name:'Kind 1',url:''},{name:'Kind 2',url:''}];
const children=DEMO_CHILDREN.map(child=>({...child}));
const $=id=>document.getElementById(id);
const now=new Date();
let week=mondayISO([now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'));
const dateShort=x=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(x+'T12:00:00Z'));
const mondayOffset=(iso,offset)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
const text=(tag,value,cls)=>{const element=document.createElement(tag);element.textContent=value;if(cls)element.className=cls;return element};
function updateClock(){const date=new Date();$('clock').textContent=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(date);$('day-label').textContent=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date)}
function showLessons(root,lessons){root.replaceChildren();const days=text('div','','days');const today=new Date().toLocaleDateString('en-CA');for(let i=0;i<5;i++){const date=mondayOffset(week,i),col=text('div','','day'+(date===today?' active':''));col.append(text('div',['Mo','Di','Mi','Do','Fr'][i]+' '+dateShort(date),'day-title'));const rows=lessons.filter(p=>p.date===date);if(!rows.length)col.append(text('p','–','empty'));for(const lesson of rows){const item=text('div','','lesson'+(lesson.cancelled?' cancelled':''));item.append(text('b',lesson.subject),text('small',lesson.start+(lesson.end?'–'+lesson.end:'')+(lesson.room?' · '+lesson.room:'')));col.append(item)}days.append(col)}root.append(days)}
function render(){ $('week-label').textContent=dateShort(week)+' – '+dateShort(mondayOffset(week,6));$('schedules').replaceChildren();children.forEach((child,index)=>{const card=text('article','','schedule');const head=text('div','','schedule-head');head.append(text('span',index===0?'☀':'✿','avatar'));const heading=text('div','');heading.append(text('h2',child.name),text('div','Beispiel-Stundenplan','small'));head.append(heading);card.append(head);const content=text('div','','card-content');card.append(content);$('schedules').append(card);showLessons(content,demoLessons(week,index))}) }
$('previous').onclick=()=>{week=mondayOffset(week,-7);render()};
$('next').onclick=()=>{week=mondayOffset(week,7);render()};
$('today').onclick=()=>{const date=new Date();week=mondayISO([date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'));render()};
updateClock();setInterval(updateClock,30000);render();
