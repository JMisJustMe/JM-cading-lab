/** JM CP19: additive least-privilege guard of original two-branch browser proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../.github/workflows/jm-legacy-two-branch-playwright-host-proof.yml',import.meta.url),'utf8');

test('original two historical source identities are retained unchanged',()=>{
 assert.match(source,/source_branch: factory\/jm-agi-lab-runtime-console-v1/);
 assert.match(source,/source_branch: jm-ai-executable-body-contact-v0-1/);
 assert.match(source,/kind: AGI_RUNTIME/);
 assert.match(source,/kind: ROUTEOS_REAL_CONTACT/);
});
test('historical checkout is nonpersistent and token has read-only scope',()=>{
 assert.match(source,/permissions:\s*\n\s*contents: read/);
 assert.match(source,/persist-credentials: false/);
 assert.doesNotMatch(source,/pull_request_target\s*:/);
 assert.doesNotMatch(source,/contents:\s*write|id-token:\s*write|actions:\s*write/);
});
test('Playwright install never runs source-tree lifecycle scripts',()=>{
 assert.match(source,/npm install --no-save --ignore-scripts --no-audit --no-fund playwright@1\.54\.1/);
 assert.doesNotMatch(source,/\bnpm\s+(?:ci|install)[^\n]*--ignore-scripts[^\n]*&&\s+npm\s+run/);
 assert.match(source,/npx --no-install playwright install --with-deps chromium/);
});
test('original offline artefact and loopback proof remain present',()=>{
 assert.match(source,/python3 -m http\.server "\$PORT" --bind 127\.0\.0\.1/);
 assert.match(source,/node "\$TESTFILE"/);
 assert.match(source,/actions\/upload-artifact@v4/);
 assert.doesNotMatch(source,/actions\/cache@/);
});
