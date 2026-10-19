// Supabase Auth REST client with refresh rotation. No service-role credentials in browsers.
const STORAGE='fambo-auth-v1';
let config;
let session;
let refreshing;
const endpoint = (path)=>`${config.url}/auth/v1/${path}`;
async function request(path,opts={}) {
 const response=await fetch(endpoint(path),{...opts,headers:{apikey:config.key,'Content-Type':'application/json',...(opts.headers||{})},cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.msg||data.error_description||data.message||'Anmeldung fehlgeschlagen');
 return data;
}
const persist=s=>{session=s; if(s)localStorage.setItem(STORAGE,JSON.stringify(s));else localStorage.removeItem(STORAGE)};
export async function initAuth() {
 const r=await fetch('/api/config',{cache:'no-store'});const data=await r.json();
 if(!r.ok)throw Error(data.error||'Authentifizierung nicht konfiguriert');
 config=data;
 try{session=JSON.parse(localStorage.getItem(STORAGE));}catch{session=null}
 if(session)try{await token()}catch{persist(null)}
 return session?.user||null;
}
export function currentUser(){return session?.user||null}
export async function signUp(email,password){
 const data=await request('signup',{method:'POST',body:JSON.stringify({email,password})});
 if(data.access_token)persist(data);
 return {user:data.user,needsConfirmation:!data.access_token};
}
export async function signIn(email,password){
 const data=await request('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});persist(data);return data.user;
}
export async function signOut(){
 try{if(session?.access_token)await request('logout',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}})}finally{persist(null)}
}
export async function token(){
 if(!session?.access_token)throw Error('Bitte anmelden.');
 if(Date.now()<((session.expires_at||0)*1000-60000))return session.access_token;
 if(!refreshing)refreshing=request('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})}).then(data=>{persist(data);return data.access_token}).catch(e=>{persist(null);throw e}).finally(()=>{refreshing=null});
 return refreshing;
}
export async function familyRequest(method,body){
 const jwt=await token();
 const response=await fetch(`${config.url}/rest/v1/family_plans?user_id=eq.${encodeURIComponent(session.user.id)}`,{method,headers:{apikey:config.key,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>[]);
 if(!response.ok)throw Error(data.message||'Familiendaten konnten nicht geladen werden');
 return data;
}
export async function loadFamily(){
 const rows=await familyRequest('GET');
 return rows[0]?.children??[{name:'Kind 1',url:''},{name:'Kind 2',url:''}];
}
export async function saveFamily(children){
 await familyRequest('POST',{user_id:session.user.id,children,updated_at:new Date().toISOString()});
}
