// Writes site/version.json for the published site, so Teacher Hub can sync the tool card.
// version: numeric part of VERSION in advanced.mjs (e.g. "0.6.1"); channel: suffix (e.g. "beta").
// releaseDate: Taiwan date of the oldest commit that introduced the current VERSION line.
// Fails closed: no git history (shallow clone) or unparsable version stops the build.
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export function parseVersion(source) {
  const m = /export const VERSION\s*=\s*'(\d+(?:\.\d+){1,3})(?:-([a-z]+))?'/.exec(source);
  if (!m) throw Error('VERSION constant not found in advanced.mjs');
  return {version: m[1], channel: m[2] || 'stable', label: m[2] ? `${m[1]}-${m[2]}` : m[1]};
}

export function taiwanDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw Error(`Invalid commit date: ${iso}`);
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
}

export function versionJson(source, commitIso) {
  const {version, channel, label} = parseVersion(source);
  return {version, channel, label, releaseDate: taiwanDate(commitIso)};
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const source = readFileSync(`${root}advanced.mjs`, 'utf8');
  const {label} = parseVersion(source);
  // A shallow clone makes its only commit look like it introduced everything: wrong date, no error.
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], {cwd: root, encoding: 'utf8'}).trim() === 'true') throw Error('Shallow clone: release date needs full history (fetch-depth: 0)');
  const dates = execFileSync('git', ['log', `-SVERSION='${label}'`, '--format=%cI', '--', 'advanced.mjs'], {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
  if (!dates.length) throw Error(`No commit introduces VERSION='${label}'`);
  const data = versionJson(source, dates.at(-1));
  writeFileSync(`${root}site/version.json`, JSON.stringify(data, null, 2) + '\n');
  console.log('site/version.json', JSON.stringify(data));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
