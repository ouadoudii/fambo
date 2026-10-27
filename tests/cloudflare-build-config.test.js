import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Wrangler always builds generated static assets for Git-connected deployments', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.main, 'cloudflare/worker.js');
  assert.equal(config.assets.directory, './cloudflare/public');
  assert.equal(config.build?.command, 'npm run build');
});

test('GitHub production deployment remains gated on quality', () => {
  const workflow = readFileSync(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
  assert.match(workflow, /deploy-cloudflare:\s*\n\s*name: Deploy Cloudflare after green gate\s*\n\s*needs: quality/);
  assert.match(workflow, /- run: python tests\/browser\.py/);
  assert.match(workflow, /- run: npm test/);
});
