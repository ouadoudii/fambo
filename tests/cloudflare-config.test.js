import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
test('Cloudflare deploy targets existing Worker, not an unintended second Worker',()=>{
 assert.equal(config.name,'fambo');
 assert.equal(config.main,'cloudflare/worker.js');
});
test('Cloudflare builds static files even if dashboard build command is unset',()=>{
 assert.equal(config.build.command,'npm run build');
 assert.equal(config.assets.directory,'./cloudflare/public');
 assert.equal(config.assets.binding,'ASSETS');
 assert.deepEqual(config.assets.run_worker_first,['/api/*']);
});
test('Cloudflare supports node:crypto and process.env in the imported Fambo backend',()=>{
 assert.ok(config.compatibility_flags.includes('nodejs_compat'));
 assert.ok(config.compatibility_date >= '2025-04-01');
});
