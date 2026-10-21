/**
 * Read-only health check for Fambo's Browserbase server connection.
 * Never creates or exposes a browser session or account details.
 */
export async function checkBrowserbase({env=process.env,fetcher=fetch}={}){
 const key=env.BROWSERBASE_API_KEY,project=env.BROWSERBASE_PROJECT_ID;
 if(typeof key!=='string'||!key.trim()||typeof project!=='string'||!project.trim()||/[\r\n]/.test(key+project))return false;
 if(!/^[a-zA-Z0-9-]{16,100}$/.test(project))return false;
 const response=await fetcher('https://api.browserbase.com/v1/projects/'+encodeURIComponent(project),{
  method:'GET',
  headers:{'X-BB-API-Key':key,'Accept':'application/json'},
  redirect:'error',
  signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)return false;
 const info=await response.json();
 return info?.id===project;
}
