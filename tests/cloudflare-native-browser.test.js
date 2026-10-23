import test from 'node:test';
import assert from 'node:assert/strict';
import {startNativeBrowser,getNativeViewer,releaseNativeBrowser} from '../lib/cloudflare-native-browser.js';
const id='11111111-2222-4333-8444-555555555555';
function makeEnv(){
 const calls=[];
 return {calls,env:{BROWSER:{
  acquire:async o=>{calls.push(['acquire',o]);return {sessionId:id}},
  devtools:{
   newTarget:async (...a)=>{calls.push(['target',...a]);return {id:'tab-1'}},
   listTargets:async (...a)=>{calls.push(['list',...a]);return [{id:'tab-1',type:'page',url:'https://webuntis.com/'}]}
  },
  getLiveView:async (...a)=>{calls.push(['live',...a]);return {devtoolsFrontendUrl:'https://live.browser.run/ui/view?mode=full&wss=example'}},
  closeSession:async id=>{calls.push(['close',id]);return 'closed'}
 }}};
}
test('native session opens WebUntis, not a blank tab, with recording disabled',async()=>{
 const {env,calls}=makeEnv();
 assert.deepEqual(await startNativeBrowser({env}),{sessionId:id});
 assert.equal(calls[0][1].recording,false);
 assert.equal(calls[1][2],'https://webuntis.com/');
});
test('native viewer is full interactive mode and validates exact host',async()=>{
 const {env,calls}=makeEnv();
 assert.match(await getNativeViewer(id,{env}),/^https:\/\/live\.browser\.run\//);
 assert.equal(calls[1][2].mode,'full');
 env.BROWSER.getLiveView=async()=>({devtoolsFrontendUrl:'https://live.browser.run.evil.test/?wss=token'});
 await assert.rejects(getNativeViewer(id,{env}),/Ungültiger Browser-Viewer/);
});
test('release requires validated ID and closes only selected session',async()=>{
 const {env,calls}=makeEnv();
 await assert.rejects(releaseNativeBrowser('invalid',{env}),/Ungültige Sitzung/);
 await releaseNativeBrowser(id,{env});
 assert.deepEqual(calls,[['close',id]]);
});
