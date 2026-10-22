import {createHash} from 'node:crypto';

/** Atomic Upstash Redis reservation: free-tier conservative cap (3/day and one active).
 * Lua is executed inside Redis, so separate Vercel instances cannot race.
 */
const SCRIPT=`
local global=KEYS[1]
local device=KEYS[2]
local active=KEYS[3]
local cap=tonumber(ARGV[1])
local ttl=tonumber(ARGV[2])
local lock=tonumber(ARGV[3])
if redis.call('EXISTS',active)==1 then return 0 end
if tonumber(redis.call('GET',global) or '0')>=cap then return 0 end
if tonumber(redis.call('GET',device) or '0')>=1 then return 0 end
if not redis.call('SET',active,'1','EX',lock,'NX') then return 0 end
local count=redis.call('INCR',global)
if count==1 then redis.call('EXPIRE',global,ttl) end
local localCount=redis.call('INCR',device)
if localCount==1 then redis.call('EXPIRE',device,ttl) end
return 1
`;
const safe=/^https:\/\/[a-z0-9.-]+\.upstash\.io\/?$/i;
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function reserveBrowserBudget({deviceId,env=process.env,fetcher=fetch,now=Date.now()}={}){
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const host=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof host!=='string'||!safe.test(host)||typeof token!=='string'||token.length<12||typeof deviceId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(deviceId))return false;
 const day=new Date(now).toISOString().slice(0,10);
 const global='fambo:bb:daily:'+day,device=global+':'+digest(deviceId),active='fambo:bb:active';
 try{
  const response=await fetcher(host.replace(/\/$/,'')+'/',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(['EVAL',SCRIPT,'3',global,device,active,'3','172800','900']),
   redirect:'manual',signal:AbortSignal.timeout(7000)
  });
  if(response.status>=300&&response.status<400)return false;
  if(!response.ok)return false;
  const result=await response.json();
  return result?.result===1;
 }catch{return false}
}
