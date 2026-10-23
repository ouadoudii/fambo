import test from 'node:test';
import assert from 'node:assert/strict';
import {startCloudBrowser} from '../lib/browserbase-sessions.js';
import {openWebUntisPage} from '../lib/browserbase-navigation.js';
const env={BROWSERBASE_API_KEY:'test-only',BROWSERBASE_PROJECT_ID:'11111111-2222-4333-8444-555555555555'};
const session='99999999-2222-4333-8444-555555555555';
test('new Browserbase session automatically navigates to WebUntis without exposing CDP URL',async()=>{
 let navigated='',calls=0;
 const created=await startCloudBrowser({env,fetcher:async()=>Response.json({id:session,connectUrl:'wss://connect.browserbase.com/?secret=private'}),navigate:async url=>{navigated=url;calls++;return true}});
 assert.equal(calls,1);assert.match(navigated,/^wss:\/\/connect\.browserbase\.com/);
 assert.deepEqual(created,{sessionId:session});
 assert.ok(!JSON.stringify(created).includes('private'));
});
test('navigation failure does not discard successfully created browser session',async()=>{
 const created=await startCloudBrowser({env,fetcher:async()=>Response.json({id:session,connectUrl:'wss://connect.browserbase.com/'}),navigate:async()=>{throw Error('CDP unavailable')}});
 assert.deepEqual(created,{sessionId:session});
});
test('CDP URL host is strictly validated before connecting',async()=>{
 let calls=0;
 class Socket { constructor(){calls++} }
 for(const u of ['wss://evil.example/','ws://connect.browserbase.com/','https://connect.browserbase.com/','invalid',undefined]){
  assert.equal(await openWebUntisPage(u,{WebSocketImpl:Socket}),false);
 }
 assert.equal(calls,0);
});
test('CDP navigates existing blank page rather than opening another tab',async()=>{
 const sent=[];
 class Socket {
  constructor(){this.handlers={};queueMicrotask(()=>this.handlers.open?.())}
  addEventListener(name,fn){this.handlers[name]=fn}
  send(raw){
   const req=JSON.parse(raw);sent.push(req);
   const result=req.method==='Target.getTargets'?{targetInfos:[{type:'page',url:'about:blank',targetId:'page-1'}]}
    :req.method==='Target.attachToTarget'?{sessionId:'attached-1'}:{frameId:'frame-1'};
   queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({id:req.id,result})}));
  }
  close(){}
 }
 const ok=await openWebUntisPage('wss://connect.browserbase.com/?secret=private',{WebSocketImpl:Socket,timeoutMs:1000});
 assert.equal(ok,true);
 assert.deepEqual(sent.map(x=>x.method),['Target.getTargets','Target.attachToTarget','Page.navigate']);
 assert.equal(sent[1].params.targetId,'page-1');
 assert.equal(sent[2].params.url,'https://webuntis.com/');
 assert.equal(sent[2].sessionId,'attached-1');
});
