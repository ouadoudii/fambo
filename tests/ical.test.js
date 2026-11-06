import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIcal,validIcalUrl,fetchIcal} from '../lib/ical.js';

const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;TZID=Europe/Berlin:20261109T080000\r\nDTEND;TZID=Europe/Berlin:20261109T084500\r\nSUMMARY:Mathematik\r\nLOCATION:A12\r\nEND:VEVENT\r\nEND:VCALENDAR';
test('WebUntis iCal reader extracts lessons without login/browser automation',()=>{
 const result=parseIcal(ics);
 assert.equal(result.length,1);
 assert.deepEqual(result[0],{id:'0',date:'2026-11-09',start:'08:00',end:'08:45',subject:'Mathematik',room:'A12',cancelled:false});
});
test('reader supports UTC event and escaped summary without exposing unrelated metadata',()=>{
 const input='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261109T070000Z\nDTEND:20261109T074500Z\nSUMMARY:Sport\\, Halle\nDESCRIPTION:Private account secrets\nSTATUS:CANCELLED\nEND:VEVENT\nEND:VCALENDAR';
 const events=parseIcal(input);
 assert.equal(events[0].date,'2026-11-09');
 assert.equal(events[0].start,'08:00');
 assert.equal(events[0].subject,'Sport, Halle');
 assert.equal(events[0].cancelled,true);
 assert.ok(!JSON.stringify(events).includes('Private account secrets'));
});
test('iCal URL validation refuses external hosts, plain HTTP and embedded credentials',()=>{
 for(const bad of ['http://school.webuntis.com/file.ics','https://school.webuntis.com.evil.test/file.ics','https://user:pass@school.webuntis.com/file.ics','https://127.0.0.1/file.ics','file:///tmp/calendar.ics'])assert.equal(validIcalUrl(bad),false);
 assert.equal(validIcalUrl('https://school.webuntis.com/WebUntis/ical?token=example'),true);
});
test('iCal fetch rejects redirect and never follows URLs to another host',async()=>{
 let checked;
 await assert.rejects(fetchIcal('https://school.webuntis.com/calendar',{fetcher:async(url,opts)=>{
  checked={url,opts};return new Response('',{status:302,headers:{Location:'http://127.0.0.1/private'}});
 }}),/konnte nicht abgerufen/);
 assert.equal(checked.opts.redirect,'manual');
 assert.equal(checked.url,'https://school.webuntis.com/calendar');
});
test('iCal fetch bounds actual streaming size, not only content-length',async()=>{
 const huge='BEGIN:VCALENDAR\n'+'X'.repeat(1024*1024+1);
 await assert.rejects(fetchIcal('https://school.webuntis.com/calendar',{fetcher:async()=>new Response(huge)}),/zu groß/);
});
test('no lessons in calendar does not invent a timetable',()=>{
 assert.deepEqual(parseIcal('BEGIN:VCALENDAR\nEND:VCALENDAR'),[]);
});
