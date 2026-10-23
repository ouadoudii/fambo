import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNativeBrowserError} from '../lib/cloudflare-native-browser.js';

test('Cloudflare browser start errors are classified without leaking provider messages',()=>{
 const cases=[
  [new Error('Maximum sessions reached for account X'), 'cloudflare_session_limit'],
  [new Error('Concurrent browser session limit reached'), 'cloudflare_session_limit'],
  [new Error('Invalid session ID: sensitive-session'), 'cloudflare_session_invalid'],
  [new Error('fetch failed'), 'cloudflare_unavailable'],
  [Object.assign(new Error('Cloudflare capacity'),{status:503}), 'cloudflare_unavailable'],
  [Object.assign(new Error('limit'),{status:429}), 'cloudflare_daily_limit'],
  [Object.assign(new Error('billing'),{status:402}), 'cloudflare_billing'],
  [new Error('opaque upstream failure'), 'session_setup_failed']
 ];
 for(const [error, expected] of cases)assert.equal(classifyNativeBrowserError(error),expected);
});
