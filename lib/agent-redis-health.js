/** Read-only Redis diagnostics. Never return URLs, tokens or upstream bodies. */
export async function diagnoseAgentRedis({env=process.env,fetcher=fetch}={}){
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const url=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof url!=='string'||!/^https:\\/\\/[a-z0-9.-]+\\.upstash\\.io\\/?$/i.test(url)||typeof token!=='string'||token.length<12)
  return {available:false,reason:'configuration'};
 try{
  const response=await fetcher(url.replace(/\\/$/,'')+'/ping',{
   headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(6500)
  });
  if(response.status===401||response.status===403)return {available:false,reason:'authentication'};
  if(!response.ok)return {available:false,reason:'upstream'};
  const info=await response.json();
  return info?.result==='PONG'?{available:true,reason:'ok'}:{available:false,reason:'unexpected_response'};
 }catch{return {available:false,reason:'network'}}
}
export async function checkAgentRedis(options={}){
 return (await diagnoseAgentRedis(options)).available;
}
