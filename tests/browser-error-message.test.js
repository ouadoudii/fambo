import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/agent/start.js',import.meta.url),'utf8');
test('retained cloud-browser endpoint still propagates safe errors and reasons',()=>{
 assert.match(backend,/reason=env\.BROWSER\?classifyNativeBrowserError/);
 assert.match(backend,/BrowserbaseSessionError\?error\.reason/);
 assert.match(backend,/status\(502\)\.json\(\{error:'Browser konnte nicht gestartet werden\.',reason\}\)/);
});
test('iCal schedule errors are shown to the family without retrying a cloud browser',()=>{
 assert.match(app,/if\(!response\.ok\)throw Error\(body\.error/);
 assert.match(app,/Stundenplan momentan nicht verfügbar/);
 assert.match(app,/retry\.onclick=\(\)=>render\(\)/);
 assert.doesNotMatch(app,/\/api\/agent\/start/);
});
