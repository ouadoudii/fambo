import {agentLaunchAllowed} from '../../lib/agent-policy.js';
export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({available:false});
 const e=process.env;
 const ready=agentLaunchAllowed(e)&&Boolean(e.BROWSERBASE_API_KEY&&e.BROWSERBASE_PROJECT_ID)&&
  Boolean((e.KV_REST_API_URL&&e.KV_REST_API_TOKEN)||(e.UPSTASH_REDIS_REST_URL&&e.UPSTASH_REDIS_REST_TOKEN));
 return res.status(200).json({available:ready});
}
