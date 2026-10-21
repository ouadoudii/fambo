import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBrowserbase} from '../lib/browserbase-health.js';
import handler from '../api/browserbase-health.js';
const good={BROWSERBASE_API_KEY:'test-api-key',BROWSERBASE_PROJECT_ID:'c4b1b456-8db2-4ec1-a18d-e7230809b887'};
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
test('no connection attempt without environment credentials',async()=>{
 let calls=0;assert.equal(await checkBrowserbase({env:{},fetcher:async()=>{calls++}}),false);assert.equal(calls,0);
});
test('read-only auth probe validates project and never starts browser sessions',async()=>{
 let seen;
 const ok=await checkBrowserbase({env:good,fetcher:async(url,options)=>{seen={url,options};return new Response(JSON.stringify({id:good.BROWSERBASE_PROJECT_ID,secret:'should-never-return'}),{status:200})}});
 assert.equal(ok,true);
 assert.equal(seen.url,'https://api.browserbase.com/v1/projects/'+good.BROWSERBASE_PROJECT_ID);
 assert.equal(seen.options.method,'GET');
 assert.equal(seen.options.headers['X-BB-API-Key'],good.BROWSERBASE_API_KEY);
 assert.equal(seen.options.redirect,'error');
});
test('does not accept unrelated project or unauthorized key',async()=>{
 assert.equal(await checkBrowserbase({env:good,fetcher:async()=>new Response(JSON.stringify({id:'other'}))}),false);
 assert.equal(await checkBrowserbase({env:good,fetcher:async()=>new Response('bad key',{status:401})}),false);
});
test('public status response never exposes private identifiers, keys or exceptions',async()=>{
 const original=global.fetch;const envBackup={BROWSERBASE_API_KEY:process.env.BROWSERBASE_API_KEY,BROWSERBASE_PROJECT_ID:process.env.BROWSERBASE_PROJECT_ID};
 process.env.BROWSERBASE_API_KEY=good.BROWSERBASE_API_KEY;
 process.env.BROWSERBASE_PROJECT_ID=good.BROWSERBASE_PROJECT_ID;
 try{
  global.fetch=async()=>new Response(JSON.stringify({id:good.BROWSERBASE_PROJECT_ID,apiKey:good.BROWSERBASE_API_KEY}));
  let res=response();await handler({method:'GET'},res);
  assert.equal(res.statusCode,200);assert.deepEqual(res.body,{available:true});
  assert.ok(!JSON.stringify(res.body).includes(good.BROWSERBASE_API_KEY));
  assert.ok(!JSON.stringify(res.body).includes(good.BROWSERBASE_PROJECT_ID));
  assert.match(res.headers['Cache-Control'],/s-maxage=300/);
  res=response();await handler({method:'POST'},res);assert.equal(res.statusCode,405);
  global.fetch=async()=>{throw Error('Upstream secret: '+good.BROWSERBASE_API_KEY)};
  res=response();await handler({method:'GET'},res);
  assert.deepEqual(res.body,{available:false});assert.equal(res.statusCode,503);
 }finally{
  global.fetch=original;
  for(const [key,value] of Object.entries(envBackup)){if(value===undefined)delete process.env[key];else process.env[key]=value}
 }
});
