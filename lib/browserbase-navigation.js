/** Navigate the first Browserbase page to WebUntis before the user opens DevTools.
 * The Browserbase CDP URL is a secret and is never sent to Fambo clients.
 */
export async function openWebUntisPage(connectUrl,{WebSocketImpl=globalThis.WebSocket,timeoutMs=12000,onFailure=()=>{}}={}){
 let url;
 try{url=new URL(connectUrl)}catch{onFailure('invalid_endpoint');return false}
 if(url.protocol!=='wss:'||url.hostname!=='connect.browserbase.com'){onFailure('invalid_endpoint');return false}
 if(typeof WebSocketImpl!=='function'){onFailure('websocket_unavailable');return false}
 return new Promise(resolve=>{
  let finished=false,ws;
  const finish=(value,reason)=>{if(finished)return;finished=true;if(!value)onFailure(reason||'navigation_unconfirmed');clearTimeout(timer);try{ws?.close()}catch{}resolve(value)};
  const timer=setTimeout(()=>finish(false,'navigation_timeout'),timeoutMs);
  let nextId=0;
  const pending=new Map();
  const send=(method,params={},sessionId)=>new Promise((yes,no)=>{
   if(finished)return no(Error('closed'));
   const id=++nextId;
   pending.set(id,{yes,no});
   try{ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))}catch(e){pending.delete(id);no(e)}
  });
  try{
   ws=new WebSocketImpl(connectUrl);
   ws.addEventListener('message',event=>{
    let data;try{data=JSON.parse(String(event.data))}catch{return}
    if(!pending.has(data.id))return;
    const p=pending.get(data.id);pending.delete(data.id);
    data.error?p.no(Error('CDP rejected')):p.yes(data.result||{});
   });
   ws.addEventListener('error',()=>finish(false,'cdp_connection_failed'));
   ws.addEventListener('close',()=>finish(false,'cdp_connection_closed'));
   ws.addEventListener('open',async()=>{
    try{
     const targets=await send('Target.getTargets');
     let page=targets.targetInfos?.find(x=>x.type==='page'&&x.url==='about:blank')
      ||targets.targetInfos?.find(x=>x.type==='page');
     if(!page?.targetId){
      const created=await send('Target.createTarget',{url:'about:blank'});
      if(!created.targetId)return finish(false,'no_browser_tab');
      page={targetId:created.targetId};
     }
     const attached=await send('Target.attachToTarget',{targetId:page.targetId,flatten:true});
     if(!attached.sessionId)return finish(false,'cdp_attach_failed');
     const navigated=await send('Page.navigate',{url:'https://webuntis.com/'},attached.sessionId);
     if(navigated.errorText)return finish(false,'navigation_rejected');
     for(let attempt=0;attempt<5;attempt++){
      const actual=await send('Target.getTargets');
      const updated=actual.targetInfos?.find(x=>x.targetId===page.targetId);
      if(updated?.url?.startsWith('https://'))return finish(true);
      if(attempt<4)await new Promise(r=>setTimeout(r,250));
     }
     finish(false,'navigation_unconfirmed');
    }catch{finish(false,'cdp_command_failed')}
   });
  }catch{finish(false,'cdp_connection_failed')}
 });
}
