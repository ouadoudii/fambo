import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('browser creation propagates safe reason and HTTP status',()=>{
 assert.match(source,/err\.reason=body\.reason/);
 assert.match(source,/err\.httpStatus=response\.status/);
});
test('browser creation error remains visible after status refresh',()=>{
 assert.match(source,/await refreshCloud\(\);\s*cloudMessage\(reason\)/);
 assert.doesNotMatch(source,/await refreshCloud\(\);\s*cloudMessage\('Der Browser konnte nicht gestartet werden/);
 assert.match(source,/billing:'Browserbase-Guthaben/);
 assert.match(source,/authentication:'Browserbase-Anmeldung/);
});
