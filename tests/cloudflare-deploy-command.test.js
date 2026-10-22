import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
test('Cloudflare deploy builds static assets before Wrangler, as dashboard build command can be empty',()=>{
 const command=pkg.scripts['deploy:cloudflare'];
 assert.equal(command,'npm run build && npx --yes wrangler@4 deploy');
 assert.ok(command.indexOf('npm run build')<command.indexOf('wrangler@4 deploy'));
});
test('Cloudflare quality gate exercises the exact same deployment command without publishing',()=>{
 assert.match(workflow,/npm run deploy:cloudflare -- --dry-run --outdir \/tmp\/fambo-cloudflare-build/);
 assert.doesNotMatch(pkg.scripts['deploy:cloudflare'],/--dry-run/);
});
