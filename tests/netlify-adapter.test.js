import test from 'node:test';
import assert from 'node:assert/strict';
import {serveApi} from '../netlify/functions/api.mjs';
import {expectedOrigin} from '../api/agent/start.js';

const call=(path,{method='GET',headers={},body}={})=>serveApi(new Request('https://fambo-family.netlify.app'+path,{method,headers,body}));
test('Netlify adapter uses exact route allowlist and returns no source files',async()=>{
 const unknown=await call('/api/agent/../../lib/agent-device.js');
 assert.equal(unknown.status,404);
 const missing=await call('/api/not-a-function');
 assert.equal(missing.status,404);
 assert.deepEqual(await missing.json(),{error:'Nicht gefunden'});
});
test('Netlify health APIs fail closed and never expose secrets',async()=>{
 const original=process.env.BROWSERBASE_API_KEY;
 try{
  delete process.env.BROWSERBASE_API_KEY;
  const status=await call('/api/agent/status');
  assert.equal(status.status,200);
  assert.deepEqual(await status.json(),{available:false});
  assert.equal(status.headers.get('cache-control'),'private, no-store');
  const invalid=await call('/api/browserbase-health',{method:'POST'});
  assert.equal(invalid.status,405);
  assert.deepEqual(await invalid.json(),{available:false});
 }finally{if(original===undefined)delete process.env.BROWSERBASE_API_KEY;else process.env.BROWSERBASE_API_KEY=original}
});
test('Netlify JSON body rejects malformed and too-large requests',async()=>{
 const malformed=await call('/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:'{'});
 assert.equal(malformed.status,400);
 const huge=await call('/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:'{"x":"'+ 'a'.repeat(21000)+'"}'});
 assert.equal(huge.status,413);
});
test('Netlify API connect rejects invalid public timetable link',async()=>{
 const res=await call('/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:'https://attacker.test/path',date:'2026-10-19'})});
 assert.equal(res.status,400);
 const body=await res.json();
 assert.match(body.error,/WebUntis/);
});
test('Netlify rejects origin spoofing and disabled browser start',async()=>{
 const bad=await call('/api/agent/start',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.test'},body:'{}'});
 assert.equal(bad.status,403);
 const owner=await call('/api/agent/start',{method:'POST',headers:{'content-type':'application/json',origin:'https://fambo-family.netlify.app'},body:'{}'});
 assert.equal(owner.status,503);
 assert.equal(owner.headers.has('set-cookie'),false);
 assert.equal(expectedOrigin({headers:{host:'fambo-family.netlify.app'}}),'https://fambo-family.netlify.app');
 assert.equal(expectedOrigin({headers:{host:'fambo-family.netlify.app.evil.test'}}),'');
});
test('Netlify session endpoint requires owner cookies',async()=>{
 const res=await call('/api/agent/session');
 assert.ok([401,503].includes(res.status));
 assert.equal(res.headers.get('cache-control'),'private, no-store');
});
