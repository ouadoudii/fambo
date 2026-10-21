/** Read-only Redis connection check; never consumes session quota. */
export async function checkAgentRedis({env=process.env,fetcher=fetch}={}){
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const url=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9.-]+\.upstash\.io\/?$/i.test(url)||typeof token!=='string'||token.length<12)return false;
 try{
  const response=await fetcher(url.replace(/\/$/,'')+'/ping',{
   headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(6500)
  });
  if(!response.ok)return false;
  const info=await response.json();
  return info?.result==='PONG';
 }catch{return false}
}
