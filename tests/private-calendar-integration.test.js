import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import config from '../api/calendar/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('private events appear beneath the schedules with controls',()=>{
 const html=read('../index.html');
 assert.ok(html.indexOf('id="schedules"')<html.indexOf('id="calendar-events"'));
 assert.match(html,/id="calendar-connect"/);
 assert.match(html,/id="calendar-disconnect"/);
 assert.match(html,/src="calendar.js"/);
 assert.equal(html,read('../cloudflare/public/index.html'));
});
test('calendar access tokens never go to Fambo API or storage',()=>{
 const source=read('../calendar.js');
 assert.match(source,/calendar\.readonly/);
 assert.match(source,/accounts\.google\.com\/gsi\/client/);
 assert.match(source,/Authorization:'Bearer '/);
 assert.match(source,/textContent=/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie/);
 assert.doesNotMatch(source,/fetch\('\/api\/calendar\/(events|token|sync)/);
 assert.equal(source,read('../cloudflare/public/calendar.js'));
});
test('config endpoint returns public client ID only; rejects invalid and no setup',()=>{
 const original=process.env.GOOGLE_CALENDAR_CLIENT_ID;
 const run=()=>{
  let code=200,body,headers={};
  config({method:'GET',runtimeEnv:{}},{setHeader(k,v){headers[k]=v;return this},status(n){code=n;return this},json(x){body=x;return this}});
  return {code,body,headers};
 };
 try{
  delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
  assert.equal(run().code,503);
  const response={setHeader(){return this},status(n){this.code=n;return this},json(x){this.body=x;return this}};
  config({method:'GET',runtimeEnv:{GOOGLE_CALENDAR_CLIENT_ID:'123456-demo.apps.googleusercontent.com'}},response);
  assert.equal(response.code,200);assert.deepEqual(response.body,{clientId:'123456-demo.apps.googleusercontent.com'});
 }finally{if(original===undefined)delete process.env.GOOGLE_CALENDAR_CLIENT_ID;else process.env.GOOGLE_CALENDAR_CLIENT_ID=original}
});
test('build ships calendar module and API is allowlisted',()=>{
 assert.match(read('../scripts/build.js'),/'calendar\.js'/);
 assert.match(read('../netlify/functions/api.mjs'),/\/api\/calendar\/config/);
 assert.match(read('../package.json'),/node --check calendar\.js/);
});
