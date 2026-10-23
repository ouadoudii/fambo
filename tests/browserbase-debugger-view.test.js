import test from 'node:test';
import assert from 'node:assert/strict';
import {getCloudViewer} from '../lib/browserbase-sessions.js';
const session='11111111-2222-4333-8444-555555555555';
const env={BROWSERBASE_API_KEY:'test-only-browserbase-key',BROWSERBASE_PROJECT_ID:session};
test('viewer selects interactive debugger instead of fullscreen blank canvas',async()=>{
 const url=await getCloudViewer(session,{env,fetcher:async(_url,options)=>{
  assert.equal(options.redirect,'manual');
  return Response.json({debuggerUrl:'https://debug.browserbase.com/sessions/'+session,debuggerFullscreenUrl:'https://debug.browserbase.com/sessions/'+session+'/fullscreen',pages:[]});
 }});
 assert.equal(url,'https://debug.browserbase.com/sessions/'+session);
});
test('viewer refuses untrusted debugger URLs',async()=>{
 await assert.rejects(getCloudViewer(session,{env,fetcher:async()=>Response.json({debuggerUrl:'https://attacker.example/evil',debuggerFullscreenUrl:'https://debug.browserbase.com/sessions/'+session+'/fullscreen'})}),/Ungültiger Viewer/);
});
