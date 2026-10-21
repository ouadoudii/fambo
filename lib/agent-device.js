import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

/** Stateless, short-lived device binding for browser ownership.
 * No login, no third-party session cookies in token or localStorage.
 */
const TTL=15*60;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const b64=v=>Buffer.from(v).toString('base64url');
const sign=(payload,secret)=>createHmac('sha256',secret).update(payload).digest('base64url');
function validSecret(secret){if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw Error('Agent-Schlüssel nicht konfiguriert.')}
export function newDevice(){return randomBytes(32).toString('base64url')}
export function createSessionTicket({sessionId,deviceId,secret,now=Date.now()}){
 validSecret(secret);
 if(!UUID.test(sessionId)||!/^[A-Za-z0-9_-]{43}$/.test(deviceId))throw Error('Ungültige Sitzungsdaten');
 const expiry=Math.floor(now/1000)+TTL;
 const payload=b64(JSON.stringify({s:sessionId,d:sign(deviceId,secret),e:expiry}));
 return payload+'.'+sign(payload,secret);
}
export function verifySessionTicket(ticket,{deviceId,secret,now=Date.now()}){
 validSecret(secret);
 if(typeof ticket!=='string'||ticket.length>600||typeof deviceId!=='string')return null;
 const chunks=ticket.split('.');
 if(chunks.length!==2)return null;
 const [payload,mac]=chunks;
 const expected=sign(payload,secret);
 if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;
 try{
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!UUID.test(data.s)||!Number.isSafeInteger(data.e)||data.e<=Math.floor(now/1000)||data.e>Math.floor(now/1000)+TTL)return null;
  const hash=sign(deviceId,secret);
  if(!/^[A-Za-z0-9_-]{43}$/.test(data.d)||!timingSafeEqual(Buffer.from(data.d),Buffer.from(hash)))return null;
  return {sessionId:data.s,expiresAt:data.e};
 }catch{return null}
}
export function cookieValue(req,name){
 const raw=String(req.headers?.cookie||'');
 for(const part of raw.split(';')){
  const [key,...rest]=part.trim().split('=');
  if(key===name)return rest.join('=');
 }
 return '';
}
export const deviceCookie=id=>'__Host-fambo_device='+id+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000';
export const ticketCookie=ticket=>'__Host-fambo_browser='+ticket+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+TTL;
export const clearTicketCookie=()=> '__Host-fambo_browser=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0';
