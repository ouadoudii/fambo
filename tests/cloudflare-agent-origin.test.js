import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedOrigin} from '../api/agent/start.js';

test('Cloudflare production host is accepted exactly',()=>{
 assert.equal(expectedOrigin({headers:{host:'fambo.dadda-3ettaa.workers.dev'}}),'https://fambo.dadda-3ettaa.workers.dev');
});
test('unknown and spoofed Worker hosts remain rejected',()=>{
 for(const host of ['evil.workers.dev','fambo.dadda-3ettaa.workers.dev.evil.com','fambo-pr-1.dadda-3ettaa.workers.dev','']) {
  assert.equal(expectedOrigin({headers:{host}}),'');
 }
});
