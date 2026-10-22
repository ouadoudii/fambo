/** Read-only Redis diagnostics. Never return URLs, tokens or upstream bodies. */
function classifyFetchTypeError(error){
 const message=String(error?.message||'').toLowerCase();
 if(message.includes('redirect'))return 'invalid_redirect';
 if(message.includes('global scope')||message.includes('request context'))return 'invalid_request_context';
 if(message.includes('url')||message.includes('hostname'))return 'invalid_fetch_url';
 if(message.includes('header')||message.includes('authorization'))return 'invalid_request_header';
 if(message.includes('fetch failed')||message.includes('network'))return 'fetch_network_failed';
 return 'unknown_fetch_type_error';
}
export async function diagnoseAgentRedis({env=process.env,fetcher=fetch}={}){
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const url=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof url!=='string'||!url.trim())return {available:false,reason:'missing_url'};
 if(!/^https:\/\/[a-z0-9.-]+\.upstash\.io\/?$/i.test(url.trim()))return {available:false,reason:'invalid_url'};
 if(typeof token!=='string'||!token.trim())return {available:false,reason:'missing_token'};
 if(token.trim().length<12)return {available:false,reason:'invalid_token'};
 let signal;
 try{
  signal=AbortSignal.timeout(6500);
 }catch{
  return {available:false,reason:'runtime_timeout_unsupported'};
 }
 let response;
 try{
  response=await fetcher(url.trim().replace(/\/$/,'')+'/ping',{
   headers:{Authorization:'Bearer '+token.trim()},redirect:'manual',signal
  });
  if(response.status>=300&&response.status<400)return {available:false,reason:'upstream_redirect'};
  if(response.status===401||response.status===403)return {available:false,reason:'authentication'};
  if(!response.ok)return {available:false,reason:'upstream'};
 }catch(error){
  return {available:false,reason:error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':error?.name==='TypeError'?classifyFetchTypeError(error):'connection'};
 }
 try{
  const info=await response.json();
  return info?.result==='PONG'?{available:true,reason:'ok'}:{available:false,reason:'unexpected_response'};
 }catch{return {available:false,reason:'invalid_response'}}
}
export async function checkAgentRedis(options={}){
 return (await diagnoseAgentRedis(options)).available;
}
