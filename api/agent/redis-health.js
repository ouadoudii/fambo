import {checkAgentRedis} from '../../lib/agent-redis-health.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=60');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({available:false});
 const available=await checkAgentRedis({env:req.runtimeEnv||process.env});
 return res.status(available?200:503).json({available});
}
