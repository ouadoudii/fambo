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

test('Live verification targets URL emitted by the actual Wrangler deployment',()=>{
 const deploy=workflow.split('  deploy-cloudflare:')[1].split('  verify-cloudflare-live:')[0];
 const verify=workflow.split('  verify-cloudflare-live:')[1];
 assert.match(deploy,/worker_url: \$\{\{ steps\.publish\.outputs\.worker_url \}\}/);
 assert.match(deploy,/GITHUB_OUTPUT/);
 assert.match(deploy,/workers\\\.dev/);
 assert.match(verify,/needs\.deploy-cloudflare\.outputs\.worker_url/);
 assert.match(verify,/base="\$DEPLOYED_WORKER_URL"/);
 assert.doesNotMatch(verify,/base="https:\/\/fambo\./);
});
