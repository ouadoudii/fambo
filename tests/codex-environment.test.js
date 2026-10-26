import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Codex environment installs the same browser test tools as CI',()=>{
 const dev=JSON.parse(read('../.devcontainer/devcontainer.json'));
 const setup=read('../scripts/codex-setup.sh');
 assert.match(dev.image,/node:1-22/);
 assert.equal(dev.postCreateCommand,'bash scripts/codex-setup.sh');
 assert.deepEqual(dev.forwardPorts,[4173]);
 for(const command of ['npm ci','python3 -m venv .venv','pip install --disable-pip-version-check playwright','playwright install --with-deps chromium'])assert.ok(setup.includes(command));
 assert.match(read('../.gitignore'),/\.venv\//);
});
test('local preview serves calendar module so OAuth UI can load',()=>{
 const source=read('../dev-server.js');
 assert.match(source,/calendar\\?\.js|calendar\.js/);
});
