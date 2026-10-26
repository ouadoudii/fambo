import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const publicPage=readFileSync(new URL('../cloudflare/public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('family calendar is below student schedules and before footer',()=>{
 assert.ok(page.indexOf('id="schedules"')<page.indexOf('class="family-calendar"'));
 assert.ok(page.indexOf('class="family-calendar"')<page.indexOf('<footer>'));
 assert.match(page,/aria-labelledby="family-calendar-heading"/);
});
test('Notion Calendar link remains secure while private events require OAuth',()=>{
 assert.match(page,/href="https:\/\/calendar\.notion\.so\/" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"/);
 assert.match(page,/id="calendar-connect"/);
 assert.match(page,/id="calendar-events"/);
 assert.match(page,/Deine Kalender bleiben privat/);
 assert.doesNotMatch(page,/<iframe/i);
 assert.equal(page,publicPage);
});
test('mobile calendar navigation remains accessible',()=>{
 assert.match(css,/@media\(max-width:580px\)/);
 assert.match(css,/\.calendar-open:focus-visible/);
 assert.match(css,/min-height:44px/);
});
