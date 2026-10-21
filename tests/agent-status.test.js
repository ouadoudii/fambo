import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/agent/status.js';
function make(){return {headers:{},code:200,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.body=data;return this}}}
test('cloud login status fails closed when no rate-limiter or private signing key configured',()=>{
 const old=Object.fromEntries(['FAMBO_AGENT_LAUNCH_ENABLED','FAMBO_AGENT_RATE_LIMIT_READY','FAMBO_AGENT_SIGNING_KEY','BROWSERBASE_API_KEY','BROWSERBASE_PROJECT_ID','KV_REST_API_URL','KV_REST_API_TOKEN'].map(k=>[k,process.env[k]]));
 try{
  for(const key of Object.keys(old))delete process.env[key];
  let res=make();handler({method:'GET'},res);assert.deepEqual(res.body,{available:false});
  Object.assign(process.env,{FAMBO_AGENT_LAUNCH_ENABLED:'true',FAMBO_AGENT_RATE_LIMIT_READY:'true',FAMBO_AGENT_SIGNING_KEY:'a'.repeat(48),BROWSERBASE_API_KEY:'test',BROWSERBASE_PROJECT_ID:'test',KV_REST_API_URL:'https://sample.upstash.io',KV_REST_API_TOKEN:'test'});
  res=make();handler({method:'GET'},res);assert.deepEqual(res.body,{available:true});
  assert.equal(JSON.stringify(res.body).includes('sample'),false);
  res=make();handler({method:'POST'},res);assert.equal(res.code,405);
  delete process.env.KV_REST_API_TOKEN;res=make();handler({method:'GET'},res);assert.deepEqual(res.body,{available:false});
 }finally{for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
