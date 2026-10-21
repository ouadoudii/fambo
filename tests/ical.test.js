import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/ical.js';
import {parseIcalUrl,parseIcal,fetchIcalTimetable} from '../ical.js';
const LINK='https://example.webuntis.com/WebUntis/Ical.do?school=demo&id=ABC&token=fictional';
const ICS=`BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:lesson-1\r
DTSTART;TZID=Europe/Berlin:20261019T080000\r
DTEND;TZID=Europe/Berlin:20261019T084500\r
SUMMARY:Mathematik\r
LOCATION:B101\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:lesson-2\r
DTSTART:20261020T070000Z\r
DTEND:20261020T074500Z\r
SUMMARY:Englisch\\,\r
 Gruppe A\r
STATUS:CANCELLED\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:lesson-outside\r
DTSTART:20261130T080000Z\r
DTEND:20261130T084500Z\r
SUMMARY:Biologie\r
END:VEVENT\r
END:VCALENDAR`;
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(data){this.body=data;return this}});
test('only accepts https WebUntis calendar endpoints with token',()=>{
 assert.equal(parseIcalUrl(LINK),LINK);
 for(const candidate of ['http://example.webuntis.com/WebUntis/Ical.do?token=x','https://evil.example/WebUntis/Ical.do?token=x','https://example.webuntis.com.evil.test/WebUntis/Ical.do?token=x','https://example.webuntis.com/WebUntis/Ical.do','https://example.webuntis.com@evil.test/WebUntis/Ical.do?token=x','https://example.webuntis.com:8443/WebUntis/Ical.do?token=x']){
  assert.throws(()=>parseIcalUrl(candidate));
 }
});
test('parses events, timezone, folding, cancellations and filters week',()=>{
 const lessons=parseIcal(ICS,'2026-10-19');
 assert.equal(lessons.length,2);
 assert.equal(lessons[0].start,'08:00');
 assert.equal(lessons[0].room,'B101');
 assert.equal(lessons[1].start,'09:00');
 assert.equal(lessons[1].subject,'Englisch,Gruppe A');
 assert.equal(lessons[1].cancelled,true);
});
test('calendar retrieval never sends token to another site or follows redirects',async()=>{
 let seen='';
 const lessons=await fetchIcalTimetable(LINK,'2026-10-19',{fetcher:async(url,options)=>{
  seen=url;assert.equal(options.redirect,'error');
  return new Response(ICS,{headers:{'content-type':'text/calendar'}});
 }});
 assert.equal(seen,LINK);assert.equal(lessons.length,2);
});
test('invalid calendar cannot expose arbitrary remote URL',async()=>{
 let calls=0;
 const req={method:'POST',headers:{'content-type':'application/json'},body:{url:'https://evil.example/ical?token=abc',date:'2026-10-19'}};
 const old=global.fetch;global.fetch=async()=>{calls++};
 try{const res=response();await handler(req,res);assert.equal(res.statusCode,400);assert.equal(calls,0)}finally{global.fetch=old}
});
test('stateless API fetches one caller-provided calendar and no Supabase data',async()=>{
 const old=global.fetch,urls=[];global.fetch=async(url)=>{urls.push(url);return new Response(ICS,{status:200,headers:{'content-type':'text/calendar'}})};
 try{
  const res=response();await handler({method:'POST',headers:{'content-type':'application/json'},body:{url:LINK,date:'2026-10-19'}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.lessons.length,2);assert.equal(res.headers['Cache-Control'],'private, no-store');
  assert.deepEqual(urls,[LINK]);
  assert.equal(JSON.stringify(res.body).includes('fictional'),false);
 }finally{global.fetch=old}
});
