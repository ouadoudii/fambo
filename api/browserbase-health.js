import {checkBrowserbase} from '../lib/browserbase-health.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 // Prevent unauthenticated callers from repeatedly spending browser minutes:
 // health check does not create sessions and is cached by Vercel's CDN.
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=60');
 if(req.method!=='GET')return res.status(405).json({available:false});
 try{
  const available=await checkBrowserbase();
  return res.status(available?200:503).json({available});
 }catch{
  return res.status(503).json({available:false});
 }
}
