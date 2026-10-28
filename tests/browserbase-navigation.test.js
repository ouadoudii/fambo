import test from 'node:test';
import assert from 'node:assert/strict';
import {startCloudBrowser,BrowserbaseSessionError} from '../lib/browserbase-sessions.js';
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
test('failed initial navigation rejects the session and requests safe release',async()=>{
 const operations=[];
 const fetcher=async (url,opts)=>{
  operations.push({url,method:opts.method,body:opts.body});
  if(url.endsWith('/sessions'))return Response.json({id:session,connectUrl:'wss://connect.browserbase.com/'});
  return Response.json({id:session,status:'REQUEST_RELEASE'});
 };
 await assert.rejects(
  startCloudBrowser({env,fetcher,navigate:async()=>false}),
  error=>error instanceof BrowserbaseSessionError&&error.reason==='navigation_failed'
 );
 assert.equal(operations.length,2);
 assert.ok(operations[1].url.endsWith('/sessions/'+session));
 assert.match(operations[1].body,/"REQUEST_RELEASE"/);
});
test('thrown CDP errors are handled as navigation failure',async()=>{
 await assert.rejects(startCloudBrowser({
  env,
  fetcher:async()=>Response.json({id:session,connectUrl:'wss://connect.browserbase.com/'}),
  navigate:async()=>{throw Error('CDP unavailable')}
 }),error=>error instanceof BrowserbaseSessionError&&error.reason==='navigation_failed');
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
 let reads=0;
 class Socket {
  constructor(){this.handlers={};queueMicrotask(()=>this.handlers.open?.())}
  addEventListener(name,fn){this.handlers[name]=fn}
  send(raw){
   const req=JSON.parse(raw);sent.push(req);
   const result=req.method==='Target.getTargets'?{targetInfos:[{type:'page',url:++reads>1?'https://webuntis.com/':'about:blank',targetId:'page-1'}]}
    :req.method==='Target.attachToTarget'?{sessionId:'attached-1'}:{frameId:'frame-1'};
   queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({id:req.id,result})}));
  }
  close(){}
 }
 const ok=await openWebUntisPage('wss://connect.browserbase.com/?secret=private',{WebSocketImpl:Socket,timeoutMs:1000});
 assert.equal(ok,true);
 assert.deepEqual(sent.map(x=>x.method),['Target.getTargets','Target.attachToTarget','Page.navigate','Target.getTargets']);
 assert.equal(sent[1].params.targetId,'page-1');
 assert.equal(sent[2].params.url,'https://webuntis.com/');
 assert.equal(sent[2].sessionId,'attached-1');
});

test('creates a browser tab when CDP reports no pages',async()=>{
 const commands=[];
 class Socket {
  constructor(){this.handlers={};queueMicrotask(()=>this.handlers.open?.())}
  addEventListener(type,fn){this.handlers[type]=fn}
  send(raw){
   const cmd=JSON.parse(raw);commands.push(cmd);
   const reads=commands.filter(c=>c.method==='Target.getTargets').length;
   const result=cmd.method==='Target.getTargets'?
    {targetInfos:reads===1?[]:[{type:'page',targetId:'new-tab',url:'https://webuntis.com/'}]}:
    cmd.method==='Target.createTarget'?{targetId:'new-tab'}:
    cmd.method==='Target.attachToTarget'?{sessionId:'tab-session'}:{frameId:'frame'};
   queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({id:cmd.id,result})}));
  }
  close(){}
 }
 assert.equal(await openWebUntisPage('wss://connect.browserbase.com/?case=empty',{WebSocketImpl:Socket,timeoutMs:1000}),true);
 assert.deepEqual(commands.map(c=>c.method),['Target.getTargets','Target.createTarget','Target.attachToTarget','Page.navigate','Target.getTargets']);
 assert.equal(commands[3].params.url,'https://webuntis.com/');
});

test('CDP absence exposes safe diagnostic without leaking endpoint',async()=>{
 const reasons=[];
 const result=await openWebUntisPage('wss://connect.browserbase.com/',{WebSocketImpl:null,onFailure:code=>reasons.push(code)});
 assert.equal(result,false);
 assert.deepEqual(reasons,['websocket_unavailable']);
});
test('Browserbase session failure category survives API wrapper without provider URL',async()=>{
 const fetcher=async(url)=>url.endsWith('/sessions')
  ?Response.json({id:session,connectUrl:'wss://connect.browserbase.com/?secret=test'})
  :Response.json({status:'REQUEST_RELEASE'});
 await assert.rejects(
  startCloudBrowser({env,fetcher,navigate:async(_,options)=>{options.onFailure('cdp_connection_failed');return false}}),
  e=>e instanceof BrowserbaseSessionError&&e.reason==='cdp_connection_failed'&&!e.message.includes('secret')
 );
});
