import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionTicket,newDevice} from '../lib/agent-device.js';
import handler from '../api/agent/session.js';
const id='417e52e8-c994-40e2-9c8c-18fa74a4555d';
function result(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
const key='test-key'.repeat(8);
test('requires valid device ownership cookie, refuses cross-site request and other device',async()=>{
 const device=newDevice(),other=newDevice(),ticket=createSessionTicket({sessionId:id,deviceId:device,secret:key});
 const backup=process.env.FAMBO_AGENT_SIGNING_KEY;
 process.env.FAMBO_AGENT_SIGNING_KEY=key;
 const make=(d,extra={})=>({method:'GET',headers:{host:'fambo.vercel.app','sec-fetch-site':'same-origin',cookie:'__Host-fambo_device='+d+'; __Host-fambo_browser='+ticket,...extra}});
 try{
  let r=result();await handler(make(other),r);assert.equal(r.statusCode,401);
  r=result();await handler(make(device,{'sec-fetch-site':'cross-site'}),r);assert.equal(r.statusCode,403);
  r=result();await handler({...make(device),method:'DELETE'},r);assert.equal(r.statusCode,403);
  r=result();await handler({...make(device),method:'PATCH'},r);assert.equal(r.statusCode,405);
 }finally{if(backup===undefined)delete process.env.FAMBO_AGENT_SIGNING_KEY;else process.env.FAMBO_AGENT_SIGNING_KEY=backup}
});
test('GET requires valid unexpired signed ticket',async()=>{
 const device=newDevice(),ticket=createSessionTicket({sessionId:id,deviceId:device,secret:key,now:Date.UTC(2026,9,21)});
 const backup=process.env.FAMBO_AGENT_SIGNING_KEY;process.env.FAMBO_AGENT_SIGNING_KEY=key;
 try{
  const r=result();await handler({method:'GET',headers:{host:'fambo.vercel.app',cookie:'__Host-fambo_device='+device+'; __Host-fambo_browser='+ticket}},r);
  assert.equal(r.statusCode,401);assert.equal(r.headers['Cache-Control'],'private, no-store');
 }finally{if(backup===undefined)delete process.env.FAMBO_AGENT_SIGNING_KEY;else process.env.FAMBO_AGENT_SIGNING_KEY=backup}
});
