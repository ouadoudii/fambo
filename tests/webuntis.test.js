import test from 'node:test';
import assert from 'node:assert/strict';
import {publicTimetable} from '../webuntis.js';
const base={origin:'https://demo.webuntis.com',school:'demo',entityId:'1234'};
function response(body,{status=200,headers={}}={}){return new Response(body,{status,headers})}
test('initializes anonymous school session and forwards cookies for weekly API',async()=>{
 const seen=[];
 const fetcher=async(url,options)=>{seen.push({url,options});
  if(seen.length===1)return response('<html></html>',{headers:{'set-cookie':'JSESSIONID=abc123; Path=/WebUntis; HttpOnly'}});
  return response(JSON.stringify({data:{result:{data:{elementPeriods:{'1234':[]}}}}}),{headers:{'content-type':'application/json'}});
 };
 const result=await publicTimetable(base,'2026-10-19',{fetcher});
 assert.equal(seen.length,2);
 assert.ok(seen[0].url.includes('school=demo'));
 assert.match(seen[1].options.headers.Cookie,/JSESSIONID=abc123/);
 assert.match(seen[1].options.headers.Cookie,/schoolname=_ZGVtbw==/);
 assert.match(seen[1].url,/elementId=1234/);
 assert.equal(result.data.result.data.elementPeriods['1234'].length,0);
});
test('403 is surfaced as school permission requirement',async()=>{
 let count=0; const fetcher=async()=>++count===1?response('ok'):response('',{status:403});
 await assert.rejects(publicTimetable(base,'2026-10-19',{fetcher}),/ohne Schul-Anmeldung nicht/);
});
test('portal session failure never requests calendar data',async()=>{
 let count=0;await assert.rejects(publicTimetable(base,'2026-10-19',{fetcher:async()=>{count++;return response('',{status:503})}}),/nicht erreichbar/);assert.equal(count,1);
});
test('html login page is not accepted as a timetable',async()=>{
 let count=0;await assert.rejects(publicTimetable(base,'2026-10-19',{fetcher:async()=>++count===1?response('ok'):response('<html>Login</html>',{headers:{'content-type':'text/html'}})}),/keinen JSON-Stundenplan/);
});
test('semantic API errors are not rendered as empty timetables',async()=>{
 let count=0;await assert.rejects(publicTimetable(base,'2026-10-19',{fetcher:async()=>++count===1?response('ok'):response(JSON.stringify({data:{error:{data:{messageKey:'ERR_TTVIEW_NOTALLOWED_ONDATE'}}}}),{headers:{'content-type':'application/json'}})}),/Zugriff/);
});
