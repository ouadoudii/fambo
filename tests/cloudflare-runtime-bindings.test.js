import test from 'node:test';
import assert from 'node:assert/strict';
import {serveApi} from '../netlify/functions/api.mjs';

test('Cloudflare Redis health uses Worker secret bindings, not process.env',async()=>{
 const prior=globalThis.fetch;
 const env={KV_REST_API_URL:'https://fambo-example.upstash.io',KV_REST_API_TOKEN:'test-redis-token-12345'};
 let called=false;
 try{
  globalThis.fetch=async(url,opts)=>{
   called=true;
   assert.equal(url,env.KV_REST_API_URL+'/ping');
   assert.equal(opts.headers.Authorization,'Bearer '+env.KV_REST_API_TOKEN);
   return new Response(JSON.stringify({result:'PONG'}),{headers:{'Content-Type':'application/json'}});
  };
  const response=await serveApi(new Request('https://fambo.dadda-3ettaa.workers.dev/api/agent/redis-health'),env);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{available:true});
  assert.equal(called,true);
  assert.equal(response.headers.get('Cache-Control').includes('maxage'),false);
 }finally{globalThis.fetch=prior}
});

test('Cloudflare Redis health fails closed without Worker secrets',async()=>{
 const response=await serveApi(new Request('https://fambo.dadda-3ettaa.workers.dev/api/agent/redis-health'),{});
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{available:false});
});

test('Cloudflare browser status is disabled without signed, rate-limited configuration',async()=>{
 const response=await serveApi(new Request('https://fambo.dadda-3ettaa.workers.dev/api/agent/status'),{
  BROWSERBASE_API_KEY:'test',
  BROWSERBASE_PROJECT_ID:'test',
  KV_REST_API_URL:'https://fambo-example.upstash.io',
  KV_REST_API_TOKEN:'test-redis-token-12345'
 });
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{available:false});
});
