import test from 'node:test';
import assert from 'node:assert/strict';
import {startCloudBrowser,BrowserbaseSessionError,inspectBrowserbaseLessons} from '../lib/browserbase-sessions.js';
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

test('uses official debug wsUrl when session creation omits connectUrl',async()=>{
 const calls=[];
 let received;
 const fetcher=async(url,opts)=>{
  calls.push({url,opts});
  if(url.endsWith('/sessions'))return Response.json({id:session});
  if(url.endsWith('/debug'))return Response.json({wsUrl:'wss://connect.browserbase.com/debug/session?sig=private'});
  throw Error('Unexpected Browserbase request');
 };
 const created=await startCloudBrowser({env,fetcher,navigate:async url=>{received=url;return true}});
 assert.deepEqual(created,{sessionId:session});
 assert.equal(calls.length,2);
 assert.equal(calls[1].opts.method,'GET');
 assert.equal(received,'wss://connect.browserbase.com/debug/session?sig=private');
 assert.ok(!JSON.stringify(created).includes('private'));
});
test('rejects an untrusted creation endpoint and uses safe debug endpoint instead',async()=>{
 let received='';
 const fetcher=async url=>url.endsWith('/sessions')
  ?Response.json({id:session,connectUrl:'wss://connect.browserbase.com.evil.test/secret'})
  :Response.json({wsUrl:'wss://connect.browserbase.com/debug/safe'});
 await startCloudBrowser({env,fetcher,navigate:async url=>{received=url;return true}});
 assert.equal(received,'wss://connect.browserbase.com/debug/safe');
});
test('invalid debug websocket never reaches an external host',async()=>{
 let navigated;
 let release=false;
 const fetcher=async(url)=>{
  if(url.endsWith('/sessions'))return Response.json({id:session});
  if(url.endsWith('/debug'))return Response.json({wsUrl:'wss://evil.test/secret'});
  release=true;
  return Response.json({status:'REQUEST_RELEASE'});
 };
 await assert.rejects(startCloudBrowser({
  env,fetcher,navigate:async(url,{onFailure})=>{navigated=url;onFailure('invalid_endpoint');return false}
 }),error=>error instanceof BrowserbaseSessionError&&error.reason==='invalid_endpoint');
 assert.equal(navigated,'wss://evil.test/secret');
 assert.equal(release,true);
});

test('Browserbase lesson import reads only WebUntis and returns normalized fields',async()=>{
 const commands=[];
 class Socket{
  constructor(){this.handlers={};queueMicrotask(()=>this.handlers.open?.())}
  addEventListener(type,fn){this.handlers[type]=fn}
  send(raw){
   const cmd=JSON.parse(raw);commands.push(cmd);
   const result=cmd.method==='Target.getTargets'?{targetInfos:[{type:'page',targetId:'tab1',url:'https://test.webuntis.com/timetable'}]}
    :cmd.method==='Target.attachToTarget'?{sessionId:'attached'}:
     {result:{value:{ok:true,lessons:[{date:'2026-11-06',start:'08:00',subject:'Mathe',room:'17',secret:'discard'}]}}};
   queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({id:cmd.id,result})}));
  }
  close(){}
 }
 const result=await inspectBrowserbaseLessons(session,{
  env,WebSocketImpl:Socket,
  fetcher:async()=>Response.json({wsUrl:'wss://connect.browserbase.com/?safe=test'})
 });
 assert.equal(result.status,'ready');
 assert.deepEqual(result.lessons,[{id:'0',date:'2026-11-06',start:'08:00',end:'',subject:'Mathe',room:'17',cancelled:false}]);
 assert.deepEqual(commands.map(c=>c.method),['Target.getTargets','Target.attachToTarget','Runtime.evaluate']);
 assert.equal(commands[2].sessionId,'attached');
 assert.ok(!JSON.stringify(result).includes('secret'));
});
test('Browserbase import never evaluates JavaScript on a non-WebUntis page',async()=>{
 const commands=[];
 class Socket{
  constructor(){this.handlers={};queueMicrotask(()=>this.handlers.open?.())}
  addEventListener(name,fn){this.handlers[name]=fn}
  send(raw){
   const cmd=JSON.parse(raw);commands.push(cmd);
   queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({id:cmd.id,result:{targetInfos:[{type:'page',targetId:'bad',url:'https://webuntis.com.attacker.test/'}]}})}));
  }
  close(){}
 }
 const result=await inspectBrowserbaseLessons(session,{
  env,WebSocketImpl:Socket,fetcher:async()=>Response.json({wsUrl:'wss://connect.browserbase.com/'})
 });
 assert.deepEqual(result,{status:'wrong_site',lessons:[]});
 assert.deepEqual(commands.map(c=>c.method),['Target.getTargets']);
});
test('Browserbase import rejects arbitrary websocket endpoint before connecting',async()=>{
 let connected=false;
 class Socket{constructor(){connected=true}}
 await assert.rejects(inspectBrowserbaseLessons(session,{
  env,WebSocketImpl:Socket,fetcher:async()=>Response.json({wsUrl:'wss://connect.browserbase.com.evil.test/'})
 }),/nicht zulässig/);
 assert.equal(connected,false);
});
