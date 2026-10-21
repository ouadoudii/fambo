import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';

function staticAssets(){
 return {fetch:async request=>new Response('static:'+new URL(request.url).pathname,{status:200,headers:{'content-type':'text/plain'}})};
}
test('Cloudflare Worker serves static assets, never routes them into API',async()=>{
 for(const path of ['/','/index.html','/app.js','/styles.css']){
  const response=await worker.fetch(new Request('https://example.workers.dev'+path),{ASSETS:staticAssets()});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'static:'+path);
 }
});
test('Cloudflare Worker enforces exact API route allowlist',async()=>{
 let assetCalls=0;
 const env={ASSETS:{fetch:async()=>{assetCalls++;return new Response('asset leak')}}};
 let res=await worker.fetch(new Request('https://example.workers.dev/api/nope'),env);
 assert.equal(res.status,404);
 assert.deepEqual(await res.json(),{error:'Nicht gefunden'});
 res=await worker.fetch(new Request('https://example.workers.dev/api/agent/status'),env);
 assert.equal(res.status,200);
 assert.deepEqual(await res.json(),{available:false});
 assert.equal(assetCalls,0);
});
test('Cloudflare deployment does not start paid browser sessions from unknown host',async()=>{
 const response=await worker.fetch(new Request('https://example.workers.dev/api/agent/start',{method:'POST',headers:{origin:'https://example.workers.dev','content-type':'application/json'},body:'{}'}),{});
 assert.equal(response.status,403);
 assert.equal(response.headers.get('Set-Cookie'),null);
});
test('Cloudflare static assets fail closed if no configured binding',async()=>{
 const response=await worker.fetch(new Request('https://example.workers.dev/app.js'),{});
 assert.equal(response.status,503);
});
test('Cloudflare malformed JSON and oversized requests remain guarded',async()=>{
 let res=await worker.fetch(new Request('https://example.workers.dev/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:'{' }),{});
 assert.equal(res.status,400);
 res=await worker.fetch(new Request('https://example.workers.dev/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:'{"value":"'+ 'x'.repeat(21000)+'"}'}),{});
 assert.equal(res.status,413);
});
