import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('daily browser quota message accurately describes limits and reset',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/device_limit:'Deine 3 Cloud-Browser-Startversuche/);
 assert.match(app,/Auch fehlgeschlagene Starts zählen/);
 assert.match(app,/00:00 Uhr UTC/);
});
