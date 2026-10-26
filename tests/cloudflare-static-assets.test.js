import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const expected=['app.js','calendar.js','index.html','lib.js','styles.css'];
test('Cloudflare default deployment assets are exactly the five intended public files',()=>{
 const files=readdirSync(new URL('../cloudflare/public/',import.meta.url)).sort();
 assert.deepEqual(files,expected);
});
test('Cloudflare static files never lag behind application sources',()=>{
 for(const name of expected){
  assert.deepEqual(readFileSync(new URL('../cloudflare/public/'+name,import.meta.url)),readFileSync(new URL('../'+name,import.meta.url)),name+' is outdated');
 }
});
test('Default npx wrangler deploy can run with no Cloudflare dashboard build command',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(cfg.name,'fambo');
 assert.equal(cfg.assets.directory,'./cloudflare/public');
 assert.equal(cfg.main,'cloudflare/worker.js');
 assert.ok(!cfg.build || cfg.build.command===undefined);
});
