import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAgentRedis} from '../lib/agent-redis-health.js';
import handler from '../api/agent/redis-health.js';
const env={KV_REST_API_URL:'https://my-cluster.upstash.io',KV_REST_API_TOKEN:'test-token-123456'};
const mock=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(x){this.body=x;return this}});
test('Redis health only issues read-only PING and never consumes budget',async()=>{
 let requests=0;
 const available=await checkAgentRedis({env,fetcher:async(url,opts)=>{
  requests++;
  assert.equal(url,'https://my-cluster.upstash.io/ping');
  assert.equal(opts.method,undefined);
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
  assert.equal(res.statusCode,200);assert.deepEqual(res.body,{available:true});
  assert.equal(JSON.stringify(res.body).includes(env.KV_REST_API_TOKEN),false);
  res=mock();await handler({method:'POST'},res);assert.equal(res.statusCode,405);
 }finally{
  global.fetch=oldFetch;
  if(oldURL===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldURL;
  if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken;
 }
});
