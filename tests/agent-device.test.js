import test from 'node:test';
import assert from 'node:assert/strict';
import {newDevice,createSessionTicket,verifySessionTicket,deviceCookie,ticketCookie,clearTicketCookie,cookieValue} from '../lib/agent-device.js';
import {startCloudBrowser,getCloudViewer,releaseCloudBrowser} from '../lib/browserbase-sessions.js';
const id='417e52e8-c994-40e2-9c8c-18fa74a4555d',key='only-for-tests'.repeat(4);
const env={BROWSERBASE_API_KEY:'fake-test-token',BROWSERBASE_PROJECT_ID:'a565193b-d5a1-47cd-b709-a6766016b390'};
test('ticket is device-bound, short-lived, tamper proof',()=>{
 const a=newDevice(),b=newDevice(),now=Date.UTC(2026,9,21);
 const ticket=createSessionTicket({sessionId:id,deviceId:a,secret:key,now});
 assert.deepEqual(verifySessionTicket(ticket,{deviceId:a,secret:key,now}),{sessionId:id,expiresAt:Math.floor(now/1000)+900});
 assert.equal(verifySessionTicket(ticket,{deviceId:b,secret:key,now}),null);
 assert.equal(verifySessionTicket(ticket+'x',{deviceId:a,secret:key,now}),null);
 assert.equal(verifySessionTicket(ticket,{deviceId:a,secret:key,now:now+900000}),null);
 assert.equal(verifySessionTicket(ticket,{deviceId:a,secret:key+'x',now}),null);
});
test('rejects weak config, forged ID and untrusted cookie scope',()=>{
 assert.throws(()=>createSessionTicket({sessionId:id,deviceId:newDevice(),secret:'too-short'}));
 assert.throws(()=>createSessionTicket({sessionId:'http://other',deviceId:newDevice(),secret:key}));
 assert.match(deviceCookie(newDevice()),/__Host-fambo_device=.*Secure; HttpOnly; SameSite=Strict/);
 assert.match(ticketCookie('example'),/Max-Age=900/);
 assert.match(clearTicketCookie(),/Max-Age=0/);
 assert.equal(cookieValue({headers:{cookie:'foo=1; __Host-fambo_device=abc; ok=2'}},'__Host-fambo_device'),'abc');
});
test('Browserbase creation is opt-in server call, recorder and captcha solver disabled',async()=>{
 let request;
 const result=await startCloudBrowser({env,fetcher:async(url,opts)=>{request={url,opts};return new Response(JSON.stringify({id,connectUrl:'wss://private.example/token',signingKey:'secret'}))}});
 assert.deepEqual(result,{sessionId:id});
 assert.equal(request.url,'https://api.browserbase.com/v1/sessions');
 assert.equal(request.opts.headers['X-BB-API-Key'],'fake-test-token');
 const body=JSON.parse(request.opts.body);
 assert.deepEqual(body.browserSettings,{recordSession:false,logSession:false,solveCaptchas:false});
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('viewer link verified and malformed origins rejected',async()=>{
 const f=async()=>new Response(JSON.stringify({debuggerFullscreenUrl:'https://www.browserbase.com/debug/safe'}));
 assert.equal(await getCloudViewer(id,{env,fetcher:f}),'https://www.browserbase.com/debug/safe');
 await assert.rejects(getCloudViewer(id,{env,fetcher:async()=>new Response(JSON.stringify({debuggerFullscreenUrl:'https://browserbase.com.evil.test/steal'}))}),/Viewer/);
 await assert.rejects(getCloudViewer('not-a-session',{env,fetcher:f}),/Sitzung/);
});
test('release session sends only validated ID',async()=>{
 let request;
 await releaseCloudBrowser(id,{env,fetcher:async(url,opts)=>{request={url,opts};return new Response('{}')}});
 assert.equal(request.url,'https://api.browserbase.com/v1/sessions/'+id);
 assert.equal(JSON.parse(request.opts.body).status,'REQUEST_RELEASE');
});
