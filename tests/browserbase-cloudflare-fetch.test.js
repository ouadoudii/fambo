import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBrowserbase} from '../lib/browserbase-health.js';
import {startCloudBrowser} from '../lib/browserbase-sessions.js';
const project='11111111-2222-4333-8444-555555555555';
const env={BROWSERBASE_API_KEY:'safe-test-key-not-real',BROWSERBASE_PROJECT_ID:project};

test('Browserbase health uses Cloudflare-compatible manual redirect mode',async()=>{
 const result=await checkBrowserbase({env,fetcher:async(url,options)=>{
  assert.equal(url,'https://api.browserbase.com/v1/projects/'+project);
  assert.equal(options.redirect,'manual');
  assert.equal(options.headers['X-BB-API-Key'],env.BROWSERBASE_API_KEY);
  return Response.json({id:project});
 }});
 assert.equal(result,true);
});

test('Browserbase health refuses redirects without forwarding credentials',async()=>{
 let calls=0;
 const result=await checkBrowserbase({env,fetcher:async(_url,options)=>{
  calls++;
  assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}})
 }});
 assert.equal(result,false);
 assert.equal(calls,1);
});

test('Browserbase session start uses manual redirect and refuses redirects',async()=>{
 let calls=0;
 await assert.rejects(startCloudBrowser({env,fetcher:async(_url,options)=>{
  calls++;
  assert.equal(options.redirect,'manual');
  assert.equal(options.method,'POST');
  return new Response(null,{status:307,headers:{Location:'https://untrusted.example/'}})
 }}),/Weiterleitung verweigert/);
 assert.equal(calls,1);
});
