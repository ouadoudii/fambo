import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNativeBrowserError,startNativeBrowser} from '../lib/cloudflare-native-browser.js';
const id='11111111-2222-4333-8444-555555555555';
test('Cloudflare errors have safe specific public categories',()=>{
 assert.equal(classifyNativeBrowserError({status:429,message:'Browser time limit exceeded for today'}),'cloudflare_daily_limit');
 assert.equal(classifyNativeBrowserError({message:'quota exceeded token SECRET'}),'cloudflare_daily_limit');
 assert.equal(classifyNativeBrowserError({status:402}),'cloudflare_billing');
 assert.equal(classifyNativeBrowserError({status:403}),'cloudflare_auth');
 assert.equal(classifyNativeBrowserError({message:'Browser binding not configured'}),'cloudflare_binding');
 assert.equal(classifyNativeBrowserError({status:503}),'cloudflare_unavailable');
 assert.equal(classifyNativeBrowserError({message:'jwt=SECRET'}),'session_setup_failed');
});
test('Cloudflare Browser Run session uses bounded five minute inactivity timeout',async()=>{
 let opts;
 const env={BROWSER:{
  acquire:async input=>{opts=input;return {sessionId:id}},
  devtools:{newTarget:async()=>({id:'tab'})},
  closeSession:async()=>{}
 }};
 assert.deepEqual(await startNativeBrowser({env}),{sessionId:id});
 assert.equal(opts.keepAlive,300000);
 assert.equal(opts.recording,false);
});
