import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
test('Cloudflare live smoke runs only after production deployment succeeds',()=>{
 assert.match(workflow,/verify-cloudflare-live:\s+name: Verify Cloudflare live after deploy\s+needs: deploy-cloudflare/);
 assert.match(workflow,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
});
test('Live smoke checks homepage and read-only status, not paid browser start',()=>{
 const section=workflow.split('  verify-cloudflare-live:')[1];
 assert.match(section,/curl.*\$base\/"/);
 assert.match(section,/\$base\/api\/agent\/status/);
 assert.match(section,/assert isinstance\(o\.get\("available"\), bool\)/);
 assert.doesNotMatch(section,/api\/agent\/start/);
});
