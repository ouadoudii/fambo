import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDevice,createSessionTicket,verifySessionTicket} from '../lib/agent-device.js';
const source=readFileSync(new URL('../api/agent/start.js',import.meta.url),'utf8');
test('valid session is checked before any new Redis budget reservation',()=>{
 const existing=source.indexOf("const existing=verifySessionTicket(");
 const budget=source.indexOf("const budget=await browserBudgetDecision(");
 assert.ok(existing>0&&budget>existing);
 assert.match(source.slice(existing,budget),/await getCloudViewer\(existing\.sessionId,\{env\}\)/);
 assert.match(source.slice(existing,budget),/status:'reused'/);
});
test('device-bound ticket cannot be reused by another browser or after expiry',()=>{
 const secret='unit-test-session-signing-secret-not-real';
 const a=newDevice(),b=newDevice(),now=Date.UTC(2026,9,23);
 const t=createSessionTicket({sessionId:'11111111-2222-4333-8444-555555555555',deviceId:a,secret,now});
 assert.ok(verifySessionTicket(t,{deviceId:a,secret,now}));
 assert.equal(verifySessionTicket(t,{deviceId:b,secret,now}),null);
 assert.equal(verifySessionTicket(t,{deviceId:a,secret,now:now+900_001}),null);
});
