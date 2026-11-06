import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('legacy browser launch quota stays secure while the new iCal flow never invokes it',()=>{
 const budget=readFileSync(new URL('../lib/agent-budget.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(budget,/GET',device/);
 assert.match(budget,/>=3/);
 assert.match(budget,/fambo:bb/);
 assert.doesNotMatch(app,/\/api\/agent\/start/);
 assert.doesNotMatch(html,/cloud-start|cloud-import/);
 assert.match(html,/ICS-Datei|Stundenplan-Datei/);
 assert.doesNotMatch(html,/Privater WebUntis-iCal-Link|iCal-Abo verwalten/);
});
