/** Netlify Function adapter for existing Vercel-style Fambo API handlers.
 * Exact allowlist: no path-based module loading, no source files in publish directory.
 */
import connect from '../../api/connect.js';
import calendarConfig from '../../api/calendar/config.js';
import configHandler from '../../api/config.js';
import timetable from '../../api/timetable.js';
import bbHealth from '../../api/browserbase-health.js';
import agentStatus from '../../api/agent/status.js';
import redisHealth from '../../api/agent/redis-health.js';
import agentStart from '../../api/agent/start.js';
import agentImport from '../../api/agent/import.js';
import agentSession from '../../api/agent/session.js';

const endpoints=new Map([
 ['/api/connect',connect],
 ['/api/calendar/config',calendarConfig],
 ['/api/config',configHandler],
 ['/api/timetable',timetable],
 ['/api/browserbase-health',bbHealth],
 ['/api/agent/status',agentStatus],
 ['/api/agent/redis-health',redisHealth],
 ['/api/agent/start',agentStart],
 ['/api/agent/import',agentImport],
 ['/api/agent/session',agentSession],
]);
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function serveApi(request,runtimeEnv){
 const url=new URL(request.url);
 const handler=endpoints.get(url.pathname);
 if(!handler)return Response.json({error:'Nicht gefunden'},{status:404,headers:JSON_HEADERS});
 let body;
 if(!['GET','HEAD'].includes(request.method)){
  const contentType=request.headers.get('content-type')||'';
  if(contentType.toLowerCase().startsWith('application/json')){
   const raw=await request.text();
   if(raw.length>20_000)return Response.json({error:'Anfrage zu groß'},{status:413,headers:JSON_HEADERS});
   try{body=raw?JSON.parse(raw):{}}catch{return Response.json({error:'Ungültiges JSON'},{status:400,headers:JSON_HEADERS})}
  }else body=await request.text();
 }
 const headers={};
 request.headers.forEach((value,key)=>{headers[key.toLowerCase()]=value});
 // Fetch Request host comes from its trusted URL; Node Request does not
 // guarantee a host header is included in test environments.
 if(headers.host&&headers.host.toLowerCase()!==url.host.toLowerCase())return Response.json({error:'Anfrage nicht erlaubt'},{status:403,headers:JSON_HEADERS});
 headers.host=url.host;
 const query=Object.fromEntries(url.searchParams.entries());
 const req={method:request.method,headers,query,body,runtimeEnv};
 let statusCode=200,result;
 const responseHeaders=new Headers(JSON_HEADERS);
 const res={
  setHeader(name,value){
   if(name.toLowerCase()==='set-cookie'){
    for(const v of (Array.isArray(value)?value:[value]))responseHeaders.append('Set-Cookie',String(v));
   }else responseHeaders.set(name,String(value));
   return this;
  },
  status(code){statusCode=code;return this},
  json(data){result=data;return this},
  end(){if(result===undefined)result=null;return this}
 };
 try{
  await handler(req,res);
  if(result===undefined)throw Error('Missing API response');
  return new Response(JSON.stringify(result),{status:statusCode,headers:responseHeaders});
 }catch{
  return Response.json({error:'Serverfehler'},{status:500,headers:JSON_HEADERS});
 }
}
export default async function handler(request){
 return serveApi(request);
}
export const config={path:'/api/*'};
