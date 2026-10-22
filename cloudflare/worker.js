/** Cloudflare Workers: static family wall and the existing server-side API.
 * No static source/secret exposure; browser launches still require exact origin allowlisting.
 */
import {serveApi} from '../netlify/functions/api.mjs';

const apiPath=path=>path==='/api'||path.startsWith('/api/');
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(apiPath(url.pathname))return serveApi(request,env);
  if(!env?.ASSETS || typeof env.ASSETS.fetch!=='function'){
   return Response.json({error:'Statische Dateien nicht verfügbar'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
  const response=await env.ASSETS.fetch(request);
  return response;
 }
};
