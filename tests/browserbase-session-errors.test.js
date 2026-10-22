import test from 'node:test';
import assert from 'node:assert/strict';
import {startCloudBrowser,BrowserbaseSessionError} from '../lib/browserbase-sessions.js';
const env={BROWSERBASE_PROJECT_ID:'11111111-2222-4333-8444-555555555555',BROWSERBASE_API_KEY:'test-only-key'};
for(const [status,reason] of [[401,'authentication'],[403,'authentication'],[402,'billing'],[429,'quota'],[503,'provider_unavailable'],[400,'request_rejected'],[302,'upstream_redirect']]){
 test('Browserbase '+status+' session error is classified safely',async()=>{
  await assert.rejects(
   startCloudBrowser({env,fetcher:async()=>new Response(null,{status})}),
   e=>e instanceof BrowserbaseSessionError&&e.reason===reason&&!e.message.includes(env.BROWSERBASE_API_KEY)
  );
 });
}
