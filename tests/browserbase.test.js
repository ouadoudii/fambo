import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateSession,getPrivateViewer,stopSession} from '../agent/browserbase.js';
const id='4e97b13b-7cb4-4fd3-b7cc-12ae34b82d41';
const env={BROWSERBASE_API_KEY:'test-secret-key',BROWSERBASE_PROJECT_ID:'test-project'};
test('configuration required; no outgoing request without keys',async()=>{
 let called=false;
 await assert.rejects(createPrivateSession({env:{},fetcher:()=>{called=true}}),/konfiguriert/);
 assert.equal(called,false);
});
test('create session uses private authenticated server request and returns no credentials',async()=>{
 let call;
 const data=await createPrivateSession({env,fetcher:async(url,init)=>{call={url,init};return new Response(JSON.stringify({id,status:'RUNNING',connectUrl:'wss://secret',signingKey:'secret'}),{status:201})}});
 assert.deepEqual(data,{id,status:'RUNNING'});
 assert.equal(call.url,'https://api.browserbase.com/v1/sessions');
 assert.equal(call.init.headers['X-BB-API-Key'],'test-secret-key');
 assert.deepEqual(JSON.parse(call.init.body),{projectId:'test-project',api_timeout:900,region:'eu-central-1'});
 assert.equal(JSON.stringify(data).includes('secret'),false);
});
test('debug viewer validates Browserbase origin and rejects lookalike domains',async()=>{
 let attempts=0;
 const fetcher=async()=>{attempts++;return new Response(JSON.stringify({debuggerFullscreenUrl:'https://viewer.browserbase.com/session/demo'}))};
 assert.equal(await getPrivateViewer(id,{env,fetcher}),'https://viewer.browserbase.com/session/demo');
 for(const invalid of ['nope','https://evil.com/a']){
  await assert.rejects(getPrivateViewer(invalid,{env,fetcher}));
 }
 assert.equal(attempts,1);
 await assert.rejects(getPrivateViewer(id,{env,fetcher:async()=>new Response(JSON.stringify({debuggerFullscreenUrl:'https://viewer.browserbase.com.evil.test/a'}))}),/gültigen Viewer/);
});
test('releases browser session without ever leaking API key',async()=>{
 let call;
 const done=await stopSession(id,{env,fetcher:async(url,init)=>{call={url,init};return new Response('{}')}});
 assert.equal(done,true);
 assert.equal(call.url,'https://api.browserbase.com/v1/sessions/'+id);
 assert.equal(JSON.parse(call.init.body).status,'REQUEST_RELEASE');
});
test('upstream errors do not return private keys or response body',async()=>{
 await assert.rejects(createPrivateSession({env,fetcher:async()=>new Response('private-details',{status:401})}),e=>{
  assert.equal(e.message,'Browserbase-Anfrage fehlgeschlagen (401).');
  assert.equal(e.message.includes('test-secret-key'),false);
  return true;
 });
});
