import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveBrowserBudget} from '../lib/agent-budget.js';
const env={KV_REST_API_URL:'https://test.upstash.io',KV_REST_API_TOKEN:'test-token-example-12345'};
test('Cloudflare Redis budget uses manual redirects and rejects redirects',async()=>{
 const opts=[];
 const result=await reserveBrowserBudget({env,deviceId:'A'.repeat(43),fetcher:async(_url,o)=>{opts.push(o);return new Response(null,{status:302})}});
 assert.equal(result,false);
 assert.equal(opts.length,1);
 assert.equal(opts[0].redirect,'manual');
 assert.equal(opts[0].method,'POST');
});
