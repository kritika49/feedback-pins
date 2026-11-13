#!/usr/bin/env node
// One-command Netlify setup for prototype comments.
//
//   node install.mjs <prototype.html> [options]
//
// What it does:
//   1. Inlines the comment layer (examples/frontend-example.js + a config block) into the HTML, just before
//      </body>, between <!-- prototype-comments:start/end --> markers. Running it again replaces that block,
//      so it is safe to re-run after updating the skill.
//   2. Writes netlify/functions/comments.mjs, and creates or updates package.json (@netlify/blobs) and
//      netlify.toml in the deploy folder.
//
// Options:
//   --dir <folder>   deploy folder (default: the HTML file's folder)
//   --prod <url>     live site origin, so the prototype also works when opened as a local file
//   --app <id>       id stored on each comment (when several prototypes share one site)
//   --config <json>  extra PROTO_COMMENTS keys as JSON, e.g. '{"layers":".modal","tabs":".tab"}'
//   --dry-run        show what would change, write nothing
//
// It never deploys. Afterwards: cd <dir> && npm install && netlify deploy --prod --dir . --functions netlify/functions

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EX = path.join(HERE, '..', 'examples');
const START = '<!-- prototype-comments:start -->', END = '<!-- prototype-comments:end -->';

const args = process.argv.slice(2);
const WITH_VALUE = ['--dir', '--prod', '--app', '--config'], opts = {};
let html, dry = false;
for (let i = 0; i < args.length; i++) {
  if (WITH_VALUE.includes(args[i])) opts[args[i]] = args[++i];
  else if (args[i] === '--dry-run') dry = true;
  else if (args[i] === '--help') html = undefined;
  else if (!args[i].startsWith('--') && !html) html = args[i];
  else { console.error('Unknown option ' + args[i]); process.exit(1); }
}
const opt = (name) => opts[name];
if (!html || args.includes('--help')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 21).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(html ? 0 : 1);
}
const fail = (m) => { console.error('Error: ' + m); process.exit(1); };
if (!fs.existsSync(html)) fail(`${html} not found`);
const dir = path.resolve(opt('--dir') || path.dirname(html));

// ---------- 1. HTML ----------
const cfg = {};
if (opt('--prod')) cfg.prod = opt('--prod').replace(/\/+$/, '');
if (opt('--app')) cfg.app = opt('--app');
if (opt('--config')) { try { Object.assign(cfg, JSON.parse(opt('--config'))); } catch (e) { fail('--config is not valid JSON: ' + e.message); } }
let client = fs.readFileSync(path.join(EX, 'frontend-example.js'), 'utf8');
client = client.replace(/<\/script/gi, '<\\/script'); // must not end the inline <script> early
const block = `${START}\n<script>window.PROTO_COMMENTS = Object.assign(${JSON.stringify(cfg)}, window.PROTO_COMMENTS || {});</script>\n<script>\n${client}\n</script>\n${END}`;

let page = fs.readFileSync(html, 'utf8');
const had = page.includes(START);
if (had) {
  const a = page.indexOf(START), b = page.indexOf(END);
  if (b < a) fail('found the start marker but not the end marker; fix the HTML by hand');
  page = page.slice(0, a) + block + page.slice(b + END.length);
} else {
  if (/data-cm-host/.test(page)) console.warn('Warning: this page already seems to contain a comment layer (data-cm-host) outside the markers. You may now have two; remove the old one.');
  const i = page.toLowerCase().lastIndexOf('</body>');
  page = i >= 0 ? page.slice(0, i) + block + '\n' + page.slice(i) : page + '\n' + block + '\n';
}
const changes = [`${had ? 'updated' : 'added'} comment layer in ${html}`];

// ---------- 2. Netlify files ----------
const writes = [[path.join(dir, 'netlify', 'functions', 'comments.mjs'), fs.readFileSync(path.join(EX, 'comments.mjs'), 'utf8')]];

const pkgPath = path.join(dir, 'package.json');
let pkg = { name: 'prototype-comments', private: true, type: 'module', dependencies: {} };
if (fs.existsSync(pkgPath)) { try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { fail(`${pkgPath} is not valid JSON`); } }
pkg.dependencies = pkg.dependencies || {};
const blobsVer = JSON.parse(fs.readFileSync(path.join(EX, 'netlify', 'package.json'), 'utf8')).dependencies['@netlify/blobs'];
if (!pkg.dependencies['@netlify/blobs']) { pkg.dependencies['@netlify/blobs'] = blobsVer; writes.push([pkgPath, JSON.stringify(pkg, null, 2) + '\n']); }

const tomlPath = path.join(dir, 'netlify.toml');
if (!fs.existsSync(tomlPath)) writes.push([tomlPath, fs.readFileSync(path.join(EX, 'netlify', 'netlify.toml'), 'utf8')]);
else {
  const t = fs.readFileSync(tomlPath, 'utf8');
  const m = /^\s*functions\s*=\s*"([^"]+)"/m.exec(t);
  if (m && path.normalize(m[1]) !== path.normalize('netlify/functions')) console.warn(`Warning: netlify.toml sets functions = "${m[1]}". Move comments.mjs there, or the endpoint /.netlify/functions/comments won't exist.`);
}

// ---------- write ----------
const base = path.basename(html).toLowerCase();
if (path.resolve(path.dirname(html)) === dir && base !== 'index.html') console.warn(`Note: Netlify serves index.html at the site root; this page will be at /${path.basename(html)}.`);
if (path.resolve(path.dirname(html)) !== dir) console.warn(`Note: the HTML is not inside ${dir}; copy it there (as index.html) before deploying.`);
for (const [p] of writes) changes.push(`${fs.existsSync(p) ? 'updated' : 'created'} ${path.relative(process.cwd(), p) || p}`);
if (dry) { console.log('Dry run, nothing written:\n  ' + changes.join('\n  ')); process.exit(0); }
fs.writeFileSync(html, page);
for (const [p, c] of writes) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
console.log('Done:\n  ' + changes.join('\n  '));
console.log(`\nNext:\n  cd ${path.relative(process.cwd(), dir) || '.'}\n  npm install\n  netlify deploy --prod --dir . --functions netlify/functions`);
console.log('\nStill check by hand (see references/context-detection.md): role/person switchers that do not change the URL (add a session() config), modals/tabs without ARIA roles (layers/tabs config), deep links to records (__protoNav).');
