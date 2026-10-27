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
test('family calendar uses Google only, keeps private events behind OAuth',()=>{
 assert.doesNotMatch(page,/calendar\\.notion\\.so|Notion Calendar/i);
 assert.match(page,/id="calendar-connect"/);
 assert.match(page,/id="calendar-events"/);
 assert.match(page,/Deine Termine bleiben privat/);
 assert.doesNotMatch(page,/<iframe/i);
 assert.equal(page,publicPage);
});
test('mobile calendar navigation remains accessible',()=>{
 assert.match(css,/@media\(max-width:580px\)/);
 assert.match(css,/\.calendar-open:focus-visible/);
 assert.match(css,/min-height:44px/);
});

test('refreshed calendar is mobile-first with usable actions and restrained spacing',()=>{
 assert.match(css,/\/\* Calm, editorial calendar section/);
 assert.match(css,/\.family-calendar-body\{max-width:none;display:grid/);
 assert.match(css,/\.family-calendar \.calendar-open\{min-height:48px/);
 assert.match(css,/@media\(max-width:580px\)\{/);
 assert.match(css,/\.family-calendar-body\{grid-template-columns:1fr/);
 assert.match(page,/id="calendar-status"[^>]*role="status"/);
 assert.match(page,/id="calendar-choices"/);
});
