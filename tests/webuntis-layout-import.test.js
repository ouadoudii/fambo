import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSessionLessons,inspectSession} from '../lib/webuntis-session-import.js';

test('normalizer accepts valid lessons and never imports incomplete rows',()=>{
 const lessons=normalizeSessionLessons([
  {date:'2026-10-26',start:'08:00',end:'08:45',subject:'Mathematik',room:'201'},
  {date:'',start:'09:00',subject:'Unknown'},
  {date:'2026-10-27',start:'not a time',subject:'Unknown'}
 ]);
 assert.equal(lessons.length,1);
 assert.equal(lessons[0].subject,'Mathematik');
});

test('WebUntis inspector handles extended selectors with safe lesson normalization',async()=>{
 const id='123e4567-e89b-42d3-a456-426614174000';
 const binding={devtools:{listTargets:async()=>[{type:'page',id:'p1',url:'https://webuntis.com/WebUntis/'}]}};
 const good=await inspectSession({binding,sessionId:id,sendCommand:async()=>({ok:true,lessons:[{date:'2026-10-26',start:'08:00',subject:'Deutsch'}]})});
 assert.equal(good.status,'ready');
 assert.equal(good.lessons.length,1);
 const unsupported=await inspectSession({binding,sessionId:id,sendCommand:async()=>({ok:true,lessons:[{date:'',start:'08:00',subject:'Deutsch'}]})});
 assert.equal(unsupported.status,'unsupported_layout');
 assert.deepEqual(unsupported.lessons,[]);
});

test('inspector extracts lesson cells, time variants, and safely filters unsupported pages',()=>{
 const source=readFileSync(new URL('../lib/webuntis-session-import.js',import.meta.url),'utf8');
 assert.match(source,/\.tt-cell/);
 assert.match(source,/data-start-time/);
 assert.match(source,/data-testid\*="lesson"/);
 assert.match(source,/location\.hostname\.endsWith/);
 assert.match(source,/padStart\(2,'0'\)/);
});
