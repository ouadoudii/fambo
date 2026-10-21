import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/connect.js';
const ORIGINAL=global.fetch;
const publicUrl='https://demo.webuntis.com/WebUntis?school=demo#/basic/timetablePublic/my-student?entityId=1234';
function req(url=publicUrl){return {method:'POST',headers:{'content-type':'application/json'},body:{url,date:'2026-10-19'}}}
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
test('rejects invalid origins and never fetches',async()=>{
 let calls=0;global.fetch=async()=>{calls++;throw Error('should not run')};
 try{
  for(const url of ['https://evil.com/?school=demo#/a?entityId=1234','http://demo.webuntis.com/WebUntis?school=demo#/a?entityId=1234','https://demo.webuntis.com.evil.net/?school=demo#/a?entityId=1234']){
   const result=res();await handler(req(url),result);assert.equal(result.statusCode,400);
  }
  assert.equal(calls,0);
 }finally{global.fetch=ORIGINAL}
});
test('rejects GET and non-JSON content, no network fetch',async()=>{
 let calls=0;global.fetch=async()=>{calls++};
 try{
  for(const request of [{...req(),method:'GET'},{...req(),headers:{'content-type':'text/plain'}}]){
   const result=res();await handler(request,result);assert.ok([405,415].includes(result.statusCode));
  }
  assert.equal(calls,0);
 }finally{global.fetch=ORIGINAL}
});
test('loads only caller-supplied public timetable without any family database access',async()=>{
 const urls=[];
 global.fetch=async(url)=>{urls.push(String(url));
  if(String(url).includes('/WebUntis?'))return new Response('<html>ok</html>',{status:200});
  return new Response(JSON.stringify({data:{result:{data:{elementPeriods:{'1234':[{id:1,date:20261019,startTime:800,endTime:845,elements:[{type:3,name:'Mathematik'}]}]}}}}}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const result=res();await handler(req(),result);
  assert.equal(result.statusCode,200);
  assert.equal(result.body.lessons[0].subject,'Mathematik');
  assert.equal(result.headers['Cache-Control'],'private, no-store');
  assert.ok(urls.every(url=>url.startsWith('https://demo.webuntis.com/')));
  assert.ok(urls.every(url=>!url.includes('supabase')));
 }finally{global.fetch=ORIGINAL}
});
test('refusal by school does not return private timetable information',async()=>{
 let count=0;global.fetch=async()=>++count===1?new Response('ok',{status:200}):new Response('forbidden',{status:403});
 try{const result=res();await handler(req(),result);assert.equal(result.statusCode,403);assert.ok(!JSON.stringify(result.body).includes('1234'));}finally{global.fetch=ORIGINAL}
});
test('different devices supply their own URL per request and never share stored URLs',async()=>{
 const first=req('https://one.webuntis.com/WebUntis?school=one#/basic/timetablePublic/my-student?entityId=111');
 const second=req('https://two.webuntis.com/WebUntis?school=two#/basic/timetablePublic/my-student?entityId=222');
 const urls=[];global.fetch=async(url)=>{urls.push(String(url));return String(url).includes('weekly/data')?new Response(JSON.stringify({elementPeriods:{}}),{headers:{'content-type':'application/json'}}):new Response('ok')};
 try{await handler(first,res());await handler(second,res());assert.equal(urls.length,4);assert.ok(urls.slice(0,2).every(u=>u.includes('one.webuntis.com')));assert.ok(urls.slice(2).every(u=>u.includes('two.webuntis.com')))}finally{global.fetch=ORIGINAL}
});
