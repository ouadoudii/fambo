import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveBrowserBudget} from '../lib/agent-budget.js';
import start,{expectedOrigin} from '../api/agent/start.js';
const dev='x'.repeat(43);
const env={UPSTASH_REDIS_REST_URL:'https://sample.upstash.io',UPSTASH_REDIS_REST_TOKEN:'test-only-token'};
function result(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
test('atomic limiter is one Redis Lua request with shared global lock and privacy-preserving hashed device',async()=>{
 let seen;
 const ok=await reserveBrowserBudget({deviceId:dev,env,now:Date.UTC(2026,9,21),fetcher:async(url,opts)=>{seen={url,opts};return new Response(JSON.stringify({result:1}))}});
 assert.equal(ok,true);
 assert.equal(seen.url,'https://sample.upstash.io/');
 const args=JSON.parse(seen.opts.body);
 assert.equal(args[0],'EVAL');assert.equal(args[2],'3');
 assert.equal(args[3],'fambo:bb:daily:2026-10-21');
 assert.ok(args[4].startsWith(args[3]+':'));
 assert.equal(args[4].includes(dev),false);
 assert.equal(args[5],'fambo:bb:active');
 assert.ok(args[1].includes("redis.call('INCR',global)"));
});
test('budget fails shut without durable Redis; errors and denials cannot launch',async()=>{
 assert.equal(await reserveBrowserBudget({deviceId:dev,env:{}}),false);
 assert.equal(await reserveBrowserBudget({deviceId:dev,env,fetcher:async()=>new Response('denied',{status:429})}),false);
 assert.equal(await reserveBrowserBudget({deviceId:dev,env,fetcher:async()=>{throw Error('offline')}}),false);
 assert.equal(await reserveBrowserBudget({deviceId:dev,env,fetcher:async()=>new Response(JSON.stringify({result:0}))}),false);
});
test('start API is fail closed for wrong origin, unknown host and disabled mode',async()=>{
 const backup={FAMBO_AGENT_LAUNCH_ENABLED:process.env.FAMBO_AGENT_LAUNCH_ENABLED};
 delete process.env.FAMBO_AGENT_LAUNCH_ENABLED;
 const valid={method:'POST',headers:{host:'fambo.vercel.app',origin:'https://fambo.vercel.app','content-type':'application/json'}};
 try{
  for(const request of [{...valid,headers:{...valid.headers,origin:'https://attacker.example'}},{...valid,headers:{...valid.headers,host:'attacker.example'}},{...valid,method:'GET'}]){
   const r=result();await start(request,r);assert.ok([403,405].includes(r.statusCode));
  }
  const r=result();await start(valid,r);assert.equal(r.statusCode,503);
  assert.equal(r.headers['Set-Cookie'],undefined);
  assert.equal(expectedOrigin(valid),'https://fambo.vercel.app');
  assert.equal(expectedOrigin({headers:{host:'attacker.example'}}),'');
 }finally{
  if(backup.FAMBO_AGENT_LAUNCH_ENABLED===undefined)delete process.env.FAMBO_AGENT_LAUNCH_ENABLED;
  else process.env.FAMBO_AGENT_LAUNCH_ENABLED=backup.FAMBO_AGENT_LAUNCH_ENABLED;
 }
});

test('Vercel Marketplace KV_REST_API_* credentials work without custom UPSTASH names',async()=>{
 const marketplace={KV_REST_API_URL:'https://example.upstash.io',KV_REST_API_TOKEN:'marketplace-test-token'};
 let requests=0;
 const ok=await reserveBrowserBudget({deviceId:dev,env:marketplace,fetcher:async(url,options)=>{
  requests++;
  assert.equal(url,'https://example.upstash.io/');
  assert.equal(options.headers.Authorization,'Bearer marketplace-test-token');
  const args=JSON.parse(options.body);
  assert.match(args[1],/if not redis.call\\('SET',active,'1','EX',lock,'NX'\\) then return 0 end/);
  return new Response(JSON.stringify({result:1}));
 }});
 assert.equal(ok,true);assert.equal(requests,1);
});
test('partial marketplace credentials do not fall back to mismatched legacy tokens',async()=>{
 const mixed={KV_REST_API_URL:'https://example.upstash.io',UPSTASH_REDIS_REST_TOKEN:'legacy-token-long-enough'};
 // Never combine a new provider URL with unrelated legacy credentials.
 let calls=0;
 assert.equal(await reserveBrowserBudget({deviceId:dev,env:mixed,fetcher:async()=>{calls++;return new Response(JSON.stringify({result:1}))}}),false);
 assert.equal(calls,0);
});
