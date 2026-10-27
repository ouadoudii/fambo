import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../calendar.js',import.meta.url),'utf8');

test('Calendar API distinguishes disabled API, scope errors and expired sessions',()=>{
 assert.match(source,/accessNotConfigured\|SERVICE_DISABLED/);
 assert.match(source,/insufficientPermissions\|ACCESS_TOKEN_SCOPE_INSUFFICIENT/);
 assert.match(source,/code===401/);
 assert.match(source,/code===429/);
 assert.match(source,/response\.json\(\)\.catch/);
});
test('Calendar error handling never prints raw provider response or tokens',()=>{
 assert.doesNotMatch(source,/JSON\.stringify\(payload\)|console\.log\(payload\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie/);
 assert.match(source,/Authorization:'Bearer '\+token/);
});
