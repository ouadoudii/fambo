import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/timetable.js';
import configHandler from '../api/config.js';
const ORIGINAL=global.fetch;
const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_ANON_KEY='public-anon-key';
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
const valid={method:'GET',headers:{authorization:'Bearer my.jwt.token'},query:{slot:'0',date:'2026-10-19'}};
test('calendar rejects anonymous requests before network call',async()=>{global.fetch=()=>{throw Error('should not fetch')};const res=response();await handler({...valid,headers:{}},res);assert.equal(res.statusCode,401);global.fetch=ORIGINAL});
test('calendar rejects untrusted direct URL parameter without valid slot',async()=>{global.fetch=()=>{throw Error('should not fetch')};const res=response();await handler({...valid,query:{url:'https://attacker.com',date:'2026-10-19'}},res);assert.equal(res.statusCode,400);global.fetch=ORIGINAL});
test('calendar accesses only logged-in user row',async()=>{
 let visited=[];global.fetch=async(url)=>{
 visited.push(String(url));
 if(String(url).includes('/auth/v1/user'))return new Response(JSON.stringify({id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}),{status:200});
 if(String(url).includes('rest/v1/family_plans'))return new Response(JSON.stringify([{children:[{name:'Child',url:'https://demo.webuntis.com/WebUntis?school=demo#/basic/timetablePublic/my-student?entityId=1234'},{name:'Other',url:''}]}]),{status:200});
 return new Response(JSON.stringify({data:{result:{data:{elementPeriods:{'1234':[]}}}}}),{status:200});
 };
 try{const res=response();await handler(valid,res);assert.equal(res.statusCode,200);assert.equal(res.headers['Cache-Control'],'private, no-store');assert.ok(visited.some(u=>u.includes('user_id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')));assert.ok(visited.every(u=>!u.includes('attacker.com')))}
 finally{global.fetch=ORIGINAL}
});
test('invalid JWT does not access family data',async()=>{let calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status:401})};try{const res=response();await handler(valid,res);assert.equal(res.statusCode,401);assert.equal(calls,1)}finally{global.fetch=ORIGINAL}});
test('config returns only public config, never service role key',()=>{const res=response();configHandler({method:'GET'},res);assert.equal(res.statusCode,200);assert.deepEqual(Object.keys(res.body).sort(),['key','url'])});
test('SQL enables RLS and scopes all actions to authenticated user',async()=>{const fs=await import('node:fs/promises');const sql=await fs.readFile(new URL('../supabase/migrations/20261019_family_plans.sql',import.meta.url),'utf8');assert.match(sql,/enable row level security/);for(const k of ['select','insert','update','delete'])assert.match(sql,new RegExp('for '+k+' to authenticated'));assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/revoke all on public\.family_plans from anon/)});
test.after(()=>{global.fetch=ORIGINAL;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=oldKey});
