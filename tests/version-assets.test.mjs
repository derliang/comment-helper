import test from 'node:test';
import assert from 'node:assert/strict';
import {stampAssets} from '../scripts/version-assets.mjs';
test('deployment revisions pin local resources and nested imports without modifying external links',()=>{
 const f={'index.html':'<link href="style.css"><script src="app.mjs"></script><a href="https://example.com">x</a>','style.css':'body{}','app.mjs':"import {x} from './engine.mjs';",'engine.mjs':'export const x=1;'};
 const a=stampAssets(f),b=stampAssets({...f,'engine.mjs':'export const x=2;'});
 assert.match(a.files['index.html'],new RegExp('app\\.mjs\\?v='+a.revision));assert.match(a.files['index.html'],new RegExp('style\\.css\\?v='+a.revision));
 assert.ok(a.files['app.mjs'].includes('./engine.mjs?v='+a.revision));assert.ok(a.files['index.html'].includes('https://example.com'));assert.notEqual(a.revision,b.revision);assert.equal(stampAssets(f).revision,a.revision);
});
