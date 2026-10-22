import {diagnoseAgentRedis} from '../../lib/agent-redis-health.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({available:false});
 const result=await diagnoseAgentRedis({env:req.runtimeEnv||process.env});
 return res.status(result.available?200:503).json(result);
}
