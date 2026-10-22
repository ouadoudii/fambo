import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAgentRedis,diagnoseAgentRedis} from '../lib/agent-redis-health.js';
import handler from '../api/agent/redis-health.js';
const env={KV_REST_API_URL:'https://my-cluster.upstash.io',KV_REST_API_TOKEN:'test-token-123456'};
const mock=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(x){this.body=x;return this}});
test('Redis health only issues read-only PING and never consumes budget',async()=>{
 let requests=0;
 const available=await checkAgentRedis({env,fetcher:async(url,opts)=>{
  requests++;
  assert.equal(url,'https://my-cluster.upstash.io/ping');
  assert.equal(opts.method,undefined);
  assert.equal(opts.redirect,'manual');
  assert.equal(opts.headers.Authorization,'Bearer test-token-123456');
  return new Response(JSON.stringify({result:'PONG'}));
 }});
 assert.equal(available,true);assert.equal(requests,1);
});
test('connection check safely fails shut',async()=>{
 assert.equal(await checkAgentRedis({env:{}}),false);
 assert.equal(await checkAgentRedis({env:{KV_REST_API_URL:'https://example.evil.net',KV_REST_API_TOKEN:'long-enough-token'}}),false);
 assert.equal(await checkAgentRedis({env,fetcher:async()=>new Response('{}',{status:401})}),false);
 assert.equal(await checkAgentRedis({env,fetcher:async()=>{throw Error('secret in upstream')}}),false);
});
test('HTTP health never discloses Redis credentials',async()=>{
 const oldFetch=global.fetch,oldURL=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN;
 process.env.KV_REST_API_URL=env.KV_REST_API_URL;process.env.KV_REST_API_TOKEN=env.KV_REST_API_TOKEN;
 try{
  global.fetch=async()=>new Response(JSON.stringify({result:'PONG'}));
  let res=mock();await handler({method:'GET'},res);
  assert.equal(res.statusCode,200);assert.deepEqual(res.body,{available:true,reason:'ok'});
  assert.equal(JSON.stringify(res.body).includes(env.KV_REST_API_TOKEN),false);
  res=mock();await handler({method:'POST'},res);assert.equal(res.statusCode,405);
 }finally{
  global.fetch=oldFetch;
  if(oldURL===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldURL;
  if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken;
 }
});

test('diagnostic reasons are safe, deterministic and exclude secrets',async()=>{
 const cases=[
  [{},'missing_url'],
  [env,'authentication',401],
  [env,'authentication',403],
  [env,'upstream',500],
  [env,'unexpected_response',200],
 ];
 for(const [settings,reason,status] of cases){
  const result=await diagnoseAgentRedis({env:settings,fetcher:async()=>new Response('{}',{status:status||200})});
  assert.equal(result.reason,reason);
  assert.equal(JSON.stringify(result).includes(env.KV_REST_API_TOKEN),false);
  assert.equal(JSON.stringify(result).includes(env.KV_REST_API_URL),false);
 }
 assert.deepEqual(await diagnoseAgentRedis({env,fetcher:async()=>{throw Error('secret info')}}),{available:false,reason:'connection'});
});

test('diagnoses missing or malformed Redis bindings without disclosing their values',async()=>{
 const variants=[
  [{KV_REST_API_URL:env.KV_REST_API_URL},'missing_token'],
  [{KV_REST_API_URL:env.KV_REST_API_URL,KV_REST_API_TOKEN:'short'},'invalid_token'],
  [{KV_REST_API_URL:'redis://localhost:6379',KV_REST_API_TOKEN:env.KV_REST_API_TOKEN},'invalid_url'],
  [{KV_REST_API_URL:' '+env.KV_REST_API_URL+' ',KV_REST_API_TOKEN:' '+env.KV_REST_API_TOKEN+' '},'ok']
 ];
 for(const [settings,reason] of variants){
  const result=await diagnoseAgentRedis({env:settings,fetcher:async()=>new Response(JSON.stringify({result:'PONG'}))});
  assert.equal(result.reason,reason);
  assert.equal(JSON.stringify(result).includes(env.KV_REST_API_TOKEN),false);
 }
});

test('network diagnoses timeout and malformed upstream response separately',async()=>{
 assert.deepEqual(await diagnoseAgentRedis({env,fetcher:async()=>{throw new DOMException('secret','TimeoutError')}}),{available:false,reason:'timeout'});
 assert.deepEqual(await diagnoseAgentRedis({env,fetcher:async()=>new Response('not json')}),{available:false,reason:'invalid_response'});
 assert.deepEqual(await diagnoseAgentRedis({env,fetcher:async()=>{throw new Error('secret')}}),{available:false,reason:'connection'});
});

test('Cloudflare fetch rejects with safe type error category',async()=>{
 const result=await diagnoseAgentRedis({env,fetcher:async()=>{throw new TypeError('must not disclose upstream credentials')}});
 assert.deepEqual(result,{available:false,reason:'fetch_type_error'});
 assert.equal(JSON.stringify(result).includes(env.KV_REST_API_TOKEN),false);
});

test('Redis redirects never follow or forward bearer credentials',async()=>{
 const result=await diagnoseAgentRedis({env,fetcher:async(_url,opts)=>{
  assert.equal(opts.redirect,'manual');
  return new Response('',{status:302,headers:{Location:'https://untrusted.example/'}});
 }});
 assert.deepEqual(result,{available:false,reason:'upstream_redirect'});
});
