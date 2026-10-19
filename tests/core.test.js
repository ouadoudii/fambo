import test from 'node:test';import assert from 'node:assert/strict';import {parseUntisUrl,mondayISO,normalizeTimetable} from '../lib.js';
const url='https://avh-gym-konstanz.webuntis.com/WebUntis?school=avh-gym-konstanz#/basic/timetablePublic/my-student?date=2026-10-19&entityId=6240';
test('parses WebUntis student link',()=>assert.deepEqual(parseUntisUrl(url),{origin:'https://avh-gym-konstanz.webuntis.com',school:'avh-gym-konstanz',entityId:'6240'}));
test('rejects external hosts and non-https',()=>{for(const x of ['https://evil.com/?school=avh#/a?entityId=2','http://avh.webuntis.com/?school=avh#/a?entityId=2','https://webuntis.com/?school=avh#/a?entityId=2'])assert.throws(()=>parseUntisUrl(x))});
test('rejects missing identifier',()=>assert.throws(()=>parseUntisUrl('https://a.webuntis.com/?school=avh')));
test('computes correct monday',()=>assert.equal(mondayISO('2026-10-19'),'2026-10-19'));
test('computes monday across year',()=>assert.equal(mondayISO('2027-01-01'),'2026-12-28'));
test('rejects invalid dates',()=>assert.throws(()=>mondayISO('2026-02-30')));
test('maps classroom periods',()=>{const lessons=normalizeTimetable({data:{result:{data:{elementPeriods:{'6240':[{id:1,date:20261019,startTime:800,endTime:845,elements:[{type:3,name:'Mathematik'},{type:4,name:'101'}]}]}}}}});assert.equal(lessons[0].subject,'Mathematik');assert.equal(lessons[0].start,'08:00');assert.equal(lessons[0].room,'101');});
test('rejects unexpected API shape',()=>assert.throws(()=>normalizeTimetable({data:{result:{data:{}}}})));

test('public app bundle does not contain a fixed pupil identifier',async()=>{const {readFile}=await import('node:fs/promises');const app=await readFile(new URL('../app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/entityId=6240|avh-gym-konstanz/);assert.match(app,/name:'Kind 1',url:''/);});
