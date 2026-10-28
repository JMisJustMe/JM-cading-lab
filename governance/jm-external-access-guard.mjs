#!/usr/bin/env node
// JM ECOSTATE public delivery/source-contact guard. NOT an owner-write or device proof.
// Inherits the existing Estate map, source bodies and canonical doors: no new front door.
import { readFile, stat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPOSITORY = 'JMisJustMe/JM-cading-lab';
export const CANONICAL = Object.freeze([
  { name: 'JM Public Estate', path: 'index.html', url: 'https://jmisjustme-estate.pages.dev/' },
  { name: 'JM3232 Navigator', path: 'navigator/index.html', url: 'https://jmisjustme-estate.pages.dev/navigator/' },
  { name: 'Games & Beyond', path: 'games-beyond/index.html', url: 'https://jmisjustme.github.io/JM-cading-lab/games-beyond/' },
  { name: 'Lyrics & Music House', path: 'lyrics/index.html', url: 'https://jmisjustme-estate.pages.dev/lyrics/' },
  { name: 'Theory Multihub', path: 'theory/index.html', url: 'https://jmisjustme-estate.pages.dev/theory/' },
  { name: 'Money Menu', path: 'money-menu/launch/index.html', url: 'https://jmisjustme-estate.pages.dev/money-menu/launch/' },
]);
const BASE = 'https://jmisjustme.github.io/JM-cading-lab/';

export function validateSourcePath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') ||
      path.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..') ||
      /[?#\x00-\x1f]/.test(path)) throw Error(`Unsafe Estate carrier path: ${String(path)}`);
  return path.endsWith('/') ? `${path}index.html` : path;
}

export function targetsFromEstateMap(map) {
  if (!Array.isArray(map?.live_github_routes)) throw Error('Estate route registry absent/malformed');
  const seen = new Set(CANONICAL.map(c => c.url));
  const targets = CANONICAL.map(c => ({...c, tier: 'canonical'}));
  for (const r of map.live_github_routes) {
    if (typeof r?.path !== 'string') throw Error('Registry route lacks path');
    const path = validateSourcePath(r.path);
    const url = new URL(r.path, BASE).href;
    if (!url.startsWith(BASE)) throw Error(`Route escapes official public origin: ${url}`);
    if (!seen.has(url)) {
      seen.add(url);
      targets.push({ name: String(r.body || r.path), path, url, tier: 'registered', registered_state: String(r.state || 'UNDECLARED') });
    }
  }
  return targets;
}

export async function sourceCheck(root, path) {
  const safe = validateSourcePath(path);
  const absolute = resolve(root, safe);
  if (!absolute.startsWith(resolve(root) + sep)) return { state: 'FAIL', reason: 'ROOT_ESCAPE' };
  try {
    // A route inside root may still be a symlink pointing outside it.
    const [canonicalRoot, canonicalFile] = await Promise.all([realpath(root), realpath(absolute)]);
    if (!canonicalFile.startsWith(canonicalRoot + sep)) return { state: 'FAIL', reason: 'SYMLINK_ROOT_ESCAPE' };
    const entry = await stat(absolute);
    if (!entry.isFile() || entry.size === 0) return { state: 'FAIL', reason: 'EMPTY_OR_NOT_FILE' };
    return { state: 'PASS', bytes: entry.size };
  } catch (e) {
    if (e.code === 'ENOENT') return { state: 'FAIL', reason: 'SOURCE_MISSING' };
    return { state: 'ERROR', reason: e.code || String(e) };
  }
}

export async function liveCheck(url, fetcher = fetch, expected = 'html') {
  try {
    const res = await fetcher(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(16000), headers: { 'Accept': expected === 'json' ? 'application/json' : 'text/html' } });
    if (!res.ok) { await res.body?.cancel(); return { state: 'FAIL', http_status: res.status, reason: 'HTTP_NOT_OK' }; }
    // A login page or unrelated domain redirected with HTTP 200 is not the JM door.
    const finalUrl = res.url || url;
    if (new URL(finalUrl).origin !== new URL(url).origin) {
      await res.body?.cancel();
      return { state: 'FAIL', http_status: res.status, reason: 'CROSS_ORIGIN_REDIRECT', final_url: finalUrl };
    }
    const ct = res.headers.get('content-type') || '';
    // Explicit registry JSON is a machine contract, not a broken HTML door.
    if (expected === 'json') {
      if (!/application\/(?:json|[a-z0-9.+-]+\+json)|text\/json/i.test(ct)) {
        await res.body?.cancel();
        return { state: 'FAIL', http_status: res.status, reason: 'NON_JSON_RESPONSE', content_type: ct };
      }
      const raw = await res.text();
      try { JSON.parse(raw); } catch {
        return { state: 'FAIL', http_status: res.status, reason: 'MALFORMED_JSON' };
      }
      return { state: 'PASS', http_status: res.status, final_url: finalUrl, media: 'json' };
    }
    if (expected !== 'html') {
      await res.body?.cancel();
      return { state: 'NOT_TESTED', reason: 'UNSUPPORTED_MEDIA_TYPE', expected };
    }
    if (!/text\/html/i.test(ct)) { await res.body?.cancel(); return { state: 'FAIL', http_status: res.status, reason: 'NON_HTML_RESPONSE', content_type: ct }; }
    const reader = res.body?.getReader();
    if (!reader) return { state: 'FAIL', http_status: res.status, reason: 'NO_RESPONSE_BODY' };
    const chunk = await reader.read();
    const prefix = new TextDecoder().decode(chunk.value || new Uint8Array());
    await reader.cancel();
    if (!/<!doctype\s+html|<html[\s>]/i.test(prefix)) return { state: 'FAIL', http_status: res.status, reason: 'MISSING_HTML_DOCUMENT_START' };
    return { state: 'PASS', http_status: res.status, final_url: finalUrl };
  } catch (e) { return { state: 'ERROR', reason: e.name === 'TimeoutError' ? 'TIMEOUT' : String(e.message || e) }; }
}

export async function audit({ root, map, online = false, fetcher = fetch, concurrency = 5 }) {
  const targets = targetsFromEstateMap(map);
  const results = new Array(targets.length);
  let pointer = 0;
  async function worker() {
    while (pointer < targets.length) {
      const i = pointer++;
      const t = targets[i];
      const source = await sourceCheck(root, t.path);
      const media = t.path.endsWith('.json') ? 'json' : t.path.endsWith('.html') ? 'html' : 'unsupported';
      const live = online ? await liveCheck(t.url, fetcher, media) : { state: 'NOT_TESTED', reason: 'OFFLINE_MODE' };
      results[i] = {
        ...t, source, live,
        // GitHub permission belongs to the signed-in owner; link presence cannot assert auth.
        editor_url: `https://github.com/${REPOSITORY}/edit/main/${t.path.split('/').map(encodeURIComponent).join('/')}`,
        owner_editor_auth: 'NOT_TESTED',
        deployed_source_parity: 'NOT_TESTED',
        in_app_writeback: 'NOT_TESTED',
        persistent_reentry: 'NOT_TESTED',
        owner_device_contact: 'NOT_TESTED'
      };
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), targets.length) }, worker));
  const canonical = results.filter(x => x.tier === 'canonical');
  const registered = results.filter(x => x.tier === 'registered');
  const failed = results.filter(x => x.source.state !== 'PASS' || x.live.state !== 'PASS');
  return {
    schema: 'JM.ExternalAccess.ProofBoundary/1',
    checked_at: new Date().toISOString(),
    estate_registry: 'registry/estate-map.json',
    registry_route_entries: map.live_github_routes.length,
    checked_targets: results.length,
    online,
    canonical_ready: canonical.every(x => x.source.state === 'PASS' && x.live.state === 'PASS'),
    registered_ready: registered.every(x => x.source.state === 'PASS' && x.live.state === 'PASS'),
    source_live_failed_routes: failed.map(x => ({ path: x.path, source: x.source.state, live: x.live.state, reason: x.live.reason || x.source.reason || null })),
    whole_estate_externally_editable: 'NOT_PROVEN',
    proof_boundary: 'Repository-source presence + media-typed live HTML/JSON responses only. GitHub auth, owner editing, durable remote writes, deployment parity, cold reentry, and owner-device contact are NOT certified.',
    results
  };
}

async function main() {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf('--root');
  const outputArg = args.indexOf('--out');
  const root = resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
  const output = resolve(outputArg >= 0 ? args[outputArg + 1] : join(root, 'external-access-result.json'));
  const map = JSON.parse(await readFile(join(root, 'registry/estate-map.json'), 'utf8'));
  const report = await audit({ root, map, online: args.includes('--online') });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  for (const r of report.results) console.log(`${r.tier === 'canonical' ? 'C' : 'R'} ${r.source.state.padEnd(5)} ${r.live.state.padEnd(11)} ${r.path} ${r.url}`);
  console.log(`Scope ${report.checked_targets} routes; 6 priority canonical doors; WHOLE_ESTATE_EDITABILITY=${report.whole_estate_externally_editable}; results=${output}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const canonical = report.results.filter(x => x.tier === 'canonical');
    const lines = ['## JM External Contact Guard', '', 'Source presence / remote HTML reachability only. No write or device claim.', '', '| Door | Source | HTTP |', '|---|---|---|', ...canonical.map(x => `| ${x.name.replace(/\|/g,'/')} | ${x.source.state} | ${x.live.state} |`), '', `Registered routes inspected: ${report.registry_route_entries}; targets checked: ${report.checked_targets}.`, '', 'Writeback, owner authentication, deployment parity, device contact: **NOT TESTED**.'];
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n')+'\n');
  }
  if ((!report.canonical_ready && args.includes('--strict')) || ((!report.canonical_ready || !report.registered_ready) && args.includes('--strict-all'))) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e); process.exitCode = 2; });
