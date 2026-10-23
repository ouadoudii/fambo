import {createHash,randomUUID} from 'node:crypto';

/** Atomic Upstash Redis reservation: bounded test cap (6/day globally, 3/day per device, one active).
 * Lua is executed inside Redis, so separate Vercel instances cannot race.
 */
const SCRIPT=`
local global=KEYS[1]
local device=KEYS[2]
local active=KEYS[3]
local cap=tonumber(ARGV[1])
local ttl=tonumber(ARGV[2])
local lock=tonumber(ARGV[3])
local owner=ARGV[4]
if redis.call('EXISTS',active)==1 then return -1 end
if tonumber(redis.call('GET',global) or '0')>=cap then return -2 end
if tonumber(redis.call('GET',device) or '0')>=3 then return -3 end
if not redis.call('SET',active,owner,'EX',lock,'NX') then return -1 end
local count=redis.call('INCR',global)
if count==1 then redis.call('EXPIRE',global,ttl) end
local localCount=redis.call('INCR',device)
if localCount==1 then redis.call('EXPIRE',device,ttl) end
return 1
`;
const RELEASE_SCRIPT=`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`;
const safe=/^https:\/\/[a-z0-9.-]+\.upstash\.io\/?$/i;
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function browserBudgetDecision({deviceId,env=process.env,fetcher=fetch,now=Date.now()}={}){
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const host=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof host!=='string'||!safe.test(host)||typeof token!=='string'||token.length<12||typeof deviceId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(deviceId))return {allowed:false,reason:'budget_unavailable'};
 const owner=randomUUID();
 const day=new Date(now).toISOString().slice(0,10);
 const scope=env.BROWSER?'fambo:cf':'fambo:bb';
 const global=scope+':daily:'+day,device=global+':'+digest(deviceId),active=scope+':active';
 try{
  const response=await fetcher(host.replace(/\/$/,'')+'/',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(['EVAL',SCRIPT,'3',global,device,active,'6','172800','900',owner]),
   redirect:'manual',signal:AbortSignal.timeout(7000)
  });
  if(response.status>=300&&response.status<400)return {allowed:false,reason:'budget_unavailable'};
  if(!response.ok)return {allowed:false,reason:'budget_unavailable'};
  const result=await response.json();
  const code=result?.result;
  return code===1?{allowed:true,reservation:owner}:({allowed:false,reason:code===-1?'budget_busy':code===-2?'daily_limit':code===-3?'device_limit':'budget_unavailable'});
 }catch{return {allowed:false,reason:'budget_unavailable'}}
}

export async function reserveBrowserBudget(options){return (await browserBudgetDecision(options)).allowed;}

export async function releaseBrowserReservation({reservation,env=process.env,fetcher=fetch}={}){
 if(typeof reservation!=='string'||!/^[0-9a-f-]{36}$/i.test(reservation))return false;
 const marketplace=Boolean(env.KV_REST_API_URL||env.KV_REST_API_TOKEN);
 const host=marketplace?env.KV_REST_API_URL:env.UPSTASH_REDIS_REST_URL;
 const token=marketplace?env.KV_REST_API_TOKEN:env.UPSTASH_REDIS_REST_TOKEN;
 if(typeof host!=='string'||!safe.test(host)||typeof token!=='string'||token.length<12)return false;
 const active=(env.BROWSER?'fambo:cf':'fambo:bb')+':active';
 try{
  const response=await fetcher(host.replace(/\/$/,'')+'/',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',RELEASE_SCRIPT,'1',active,reservation]),redirect:'manual',signal:AbortSignal.timeout(7000)});
  return response.ok&&(await response.json())?.result===1;
 }catch{return false}
}
