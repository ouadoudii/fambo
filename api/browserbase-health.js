import {diagnoseBrowserbase} from '../lib/browserbase-health.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 // Private diagnostics must not be cached as a stale success or failure.
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({available:false});
 const result=await diagnoseBrowserbase({env:req.runtimeEnv||process.env});
 return res.status(result.available?200:503).json(result);
}
