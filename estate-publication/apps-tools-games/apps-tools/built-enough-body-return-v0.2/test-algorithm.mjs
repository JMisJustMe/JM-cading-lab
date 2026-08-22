import assert from 'node:assert/strict';
function digitalRoot(value) {
  let n = Math.abs(Number(value) || 0);
  while (n > 9 && ![11,22,33].includes(n)) n = String(n).split('').reduce((s,d)=>s+Number(d),0);
  return n || 1;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function hashText(text) { return [...String(text)].reduce((sum, char) => sum + char.charCodeAt(0), 0); }
assert.equal(digitalRoot(38), 11);
assert.equal(digitalRoot(44), 8);
assert.equal(digitalRoot(0), 1);
assert.equal(clamp(15, 1, 12), 12);
assert.equal(clamp(-1, 1, 12), 1);
assert.equal(hashText('start'), 558);
console.log('BODY RETURN v0.2 algorithm smoke tests passed.');
