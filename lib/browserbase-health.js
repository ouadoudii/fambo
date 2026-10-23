/**
 * Read-only diagnostics for Browserbase. Never creates sessions or returns secrets.
 * Only stable, allowlisted categories may leave the server.
 */
export async function diagnoseBrowserbase({env=process.env,fetcher=fetch}={}){
 const key=env.BROWSERBASE_API_KEY,project=env.BROWSERBASE_PROJECT_ID;
 if(typeof key!=='string'||!key.trim()||typeof project!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(project)||/[\r\n]/.test(key+project))return {available:false,reason:'configuration'};
 try{
  const response=await fetcher('https://api.browserbase.com/v1/projects/'+encodeURIComponent(project),{
   method:'GET',headers:{'X-BB-API-Key':key,'Accept':'application/json'},
   redirect:'manual',signal:AbortSignal.timeout(8000)
  });
  if(response.status===401||response.status===403)return {available:false,reason:'authentication'};
  if(response.status===404)return {available:false,reason:'project_not_found'};
  if(response.status===402)return {available:false,reason:'billing'};
  if(response.status===429)return {available:false,reason:'rate_limited'};
  if(!response.ok)return {available:false,reason:'provider_unavailable'};
  const info=await response.json();
  return info?.id===project?{available:true,reason:'ok'}:{available:false,reason:'project_mismatch'};
 }catch{return {available:false,reason:'provider_unavailable'}}
}
export async function checkBrowserbase(options={}){return (await diagnoseBrowserbase(options)).available}
