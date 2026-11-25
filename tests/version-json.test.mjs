import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVersion, taiwanDate, versionJson} from '../scripts/write-version-json.mjs';
import {VERSION} from '../advanced.mjs';

test('version.json splits numeric version and channel for Teacher Hub sync', () => {
  assert.deepEqual(parseVersion("export const VERSION='0.6.1-beta';"), {version: '0.6.1', channel: 'beta', label: '0.6.1-beta'});
  assert.deepEqual(parseVersion("export const VERSION='1.2.0';"), {version: '1.2.0', channel: 'stable', label: '1.2.0'});
  assert.throws(() => parseVersion("export const VERSION='beta';"));
});

test('release date uses Taiwan time, not UTC', () => {
  assert.equal(taiwanDate('2026-11-24T17:30:00Z'), '2026-11-25');
  assert.equal(taiwanDate('2026-11-25T15:14:10+08:00'), '2026-11-25');
  assert.throws(() => taiwanDate('not a date'));
});

test('current advanced.mjs VERSION is parsable and matches the exported constant', () => {
  const source = readFileSync(new URL('../advanced.mjs', import.meta.url), 'utf8');
  const data = versionJson(source, '2026-11-25T07:14:10Z');
  assert.equal(data.label, VERSION);
  assert.match(data.version, /^\d+(?:\.\d+){1,3}$/);
});
