import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebUntisHost,normalizeSessionLessons,inspectSession} from '../lib/webuntis-session-import.js';
const id='11111111-2222-4333-8444-555555555555';
test('only exact HTTPS WebUntis domains can be read',()=>{
 for(const url of ['https://webuntis.com/','https://anz.webuntis.com/timetable'])assert.equal(safeWebUntisHost(url),true);
 for(const url of ['https://webuntis.com.evil.test/','http://anz.webuntis.com/','https://evil.test/','https://u:p@anz.webuntis.com/'])assert.equal(safeWebUntisHost(url),false);
});
test('lesson outputs are bounded and exclude arbitrary profile or cookie fields',()=>{
 const item={date:'2026-10-23',start:'08:00',end:'08:45',subject:'Mathe',room:'123',cookie:'secret',student:'secret'};
 assert.deepEqual(normalizeSessionLessons([item]),[{id:'0',date:item.date,start:item.start,end:item.end,subject:item.subject,room:item.room,cancelled:false}]);
 assert.deepEqual(normalizeSessionLessons([{...item,start:'xx'}]),[]);
 assert.equal(normalizeSessionLessons(Array(220).fill(item)).length,200);
});
test('session inspector refuses wrong sites before calling CDP',async()=>{
 let called=false;
 const binding={devtools:{listTargets:async()=>[{type:'page',id:'1',url:'https://evil.test'}]}};
 const result=await inspectSession({binding,sessionId:id,sendCommand:async()=>{called=true}});
 assert.deepEqual(result,{status:'wrong_site',lessons:[]});assert.equal(called,false);
});
test('WebUntis inspector validates and returns only structured lesson fields',async()=>{
 const binding={devtools:{listTargets:async()=>[{type:'page',id:'1',url:'https://anz.webuntis.com/timetable'}]}};
 const result=await inspectSession({binding,sessionId:id,sendCommand:async()=>({ok:true,lessons:[{date:'2026-10-23',start:'08:00',subject:'Bio',room:'42',jwt:'never-return'}]})});
 assert.equal(result.status,'ready');
 assert.equal(result.lessons[0].jwt,undefined);
});
