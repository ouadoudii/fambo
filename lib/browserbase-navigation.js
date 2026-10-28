/** Navigate the first Browserbase page to WebUntis before the user opens DevTools.
 * The Browserbase CDP URL is a secret and is never sent to Fambo clients.
 */
export async function openWebUntisPage(connectUrl,{WebSocketImpl=globalThis.WebSocket,timeoutMs=4500}={}){
 let url;
 try{url=new URL(connectUrl)}catch{return false}
 if(url.protocol!=='wss:'||url.hostname!=='connect.browserbase.com'||typeof WebSocketImpl!=='function')return false;
 return new Promise(resolve=>{
  let finished=false,ws;
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);try{ws?.close()}catch{}resolve(value)};
  const timer=setTimeout(()=>finish(false),timeoutMs);
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
   ws.addEventListener('error',()=>finish(false));
   ws.addEventListener('close',()=>finish(false));
   ws.addEventListener('open',async()=>{
    try{
     const targets=await send('Target.getTargets');
     const page=targets.targetInfos?.find(x=>x.type==='page'&&x.url==='about:blank')
      ||targets.targetInfos?.find(x=>x.type==='page');
     if(!page?.targetId)return finish(false);
     const attached=await send('Target.attachToTarget',{targetId:page.targetId,flatten:true});
     if(!attached.sessionId)return finish(false);
     const navigated=await send('Page.navigate',{url:'https://webuntis.com/'},attached.sessionId);
     if(navigated.errorText)return finish(false);
     const actual=await send('Target.getTargets');
     const updated=actual.targetInfos?.find(x=>x.targetId===page.targetId);
     finish(Boolean(updated?.url?.startsWith('https://')));
    }catch{finish(false)}
   });
  }catch{finish(false)}
 });
}
