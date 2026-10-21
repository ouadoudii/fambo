import test from 'node:test';
import assert from 'node:assert/strict';
import {demoLessons,DEMO_CHILDREN} from '../demo.js';
test('demo contains only fictional children and no WebUntis URLs',()=>{
 assert.deepEqual(DEMO_CHILDREN.map(x=>x.name),['Alex','Mila']);
 assert.ok(DEMO_CHILDREN.every(x=>x.url===''));
});
test('demo renders a complete independent school week',()=>{
 for(const childIndex of [0,1]){
  const rows=demoLessons('2026-10-19',childIndex);
  assert.ok(rows.length>=8);
  assert.equal(new Set(rows.map(row=>row.date)).size,5);
  assert.ok(rows.every(row=>row.id.startsWith('demo-') && row.subject && row.start && row.end));
 }
 assert.notDeepEqual(demoLessons('2026-10-19',0),demoLessons('2026-10-19',1));
});
test('demo changes dates with week navigation and rejects invalid selection',()=>{
 assert.equal(demoLessons('2026-10-26',0)[0].date,'2026-10-26');
 assert.throws(()=>demoLessons('invalid',0));
 assert.throws(()=>demoLessons('2026-10-19',2));
});
