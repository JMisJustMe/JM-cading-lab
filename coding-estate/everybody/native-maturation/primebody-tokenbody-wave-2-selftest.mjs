import assert from 'node:assert/strict';
import {
  tokeniseWithCustody,
  reconstructTokenBody,
  tokenAtOffset,
  sourceSlice,
  validateCustody,
  parsePrimeBodyV02
} from './primebody-tokenbody-wave-2.mjs';

let passed = 0;
const gate = (name, fn) => { fn(); passed += 1; console.log(`PASS ${String(passed).padStart(2, '0')} ${name}`); };

const custodySource = 'RECORP?  A\n[::][->][||] ✓ Ø 32÷×& Speakuals';

gate('TokenBody starts at offset zero and reconstructs exactly', () => {
  const c = tokeniseWithCustody(custodySource);
  assert.equal(c.tokens[0].source_span.start, 0);
  assert.equal(reconstructTokenBody(c), custodySource);
  assert.equal(c.tokens.at(-1).source_span.end, custodySource.length);
});

gate('TokenBody has zero gaps and zero overlap', () => {
  const c = tokeniseWithCustody(custodySource);
  const v = validateCustody(custodySource, c);
  assert.equal(v.ok, true);
  assert.equal(v.zeroGap, true);
  assert.equal(v.exactRoundTrip, true);
});

gate('Repeated whitespace is preserved as custody not discarded', () => {
  const c = tokeniseWithCustody(custodySource);
  const spacing = c.tokens.find(t => t.kind === 'whitespace' && t.raw === '  ');
  assert.ok(spacing);
  assert.equal(spacing.pressure, 'spacing-pressure:WORKING_MODEL');
});

gate('Known pressure marks remain distinct', () => {
  const c = tokeniseWithCustody(custodySource);
  const marks = c.tokens.filter(t => t.kind === 'pressure-mark').map(t => [t.raw, t.pressure]);
  assert.deepEqual(marks, [
    ['RECORP?', 'query-inspect'],
    ['✓', 'ding'],
    ['Ø', 'no-route'],
    ['32÷×&', 'compound-operator'],
    ['Speakuals', 'relation-operator']
  ]);
});

gate('PunctBody view preserves grouped punctuation order', () => {
  const c = tokeniseWithCustody(custodySource);
  const grouped = c.punctbody.filter(p => p.raw.startsWith('[')).map(p => p.raw);
  assert.deepEqual(grouped, ['[::]', '[->]', '[||]']);
});

gate('Offset lookup returns exact carried token', () => {
  const c = tokeniseWithCustody(custodySource);
  const offset = custodySource.indexOf('Speakuals') + 2;
  assert.equal(tokenAtOffset(c, offset).raw, 'Speakuals');
});

gate('Source slice returns source text without normalization', () => {
  const c = tokeniseWithCustody(custodySource);
  const start = custodySource.indexOf('[::]');
  const end = custodySource.indexOf(' ✓');
  assert.equal(sourceSlice(custodySource, c, start, end).text, '[::][->][||]');
});

const primeSource = `PrimeBody {
  TokenBody: JM_APP_WAKEFORGE_v0_1
  GlyphBody: app=wakeforge; family=Interactive App; mode=wake
  RouteFrame: TOUCH > EFFECT > REACTION > LOOP > SAVE
  StateField: storage=portable; recovery=export_import; ui=product_first; proof=tracebox
  ContactBand: input=touch_pointer_keyboard_file; output=visible_state_change
  FormulaGate: if=source_valid; then=execute_route; else=failed_ding
  Output: JMAppReceipt.v0.1
  PunctBody: [::][->][||] ✓
}`;

gate('PrimeBody v0.2 requires all eight organs and grants build permission', () => {
  const result = parsePrimeBodyV02(primeSource);
  assert.equal(result.status, 'success');
  assert.equal(result.build_permission, true);
  assert.equal(result.checks.allrequiredorgans_present, true);
  assert.equal(result.checks.punctbody_nonempty, true);
  assert.equal(validateCustody(primeSource.replace(/\r\n?/g, '\n'), result.source_custody).ok, true);
});

gate('PrimeBody refuses missing PunctBody', () => {
  const result = parsePrimeBodyV02(primeSource.replace(/\n  PunctBody:.*(?=\n\})/, ''));
  assert.equal(result.status, 'failed');
  assert.equal(result.build_permission, false);
  assert.equal(result.checks.punctbody_present, false);
});

gate('PrimeBody refuses duplicate organs', () => {
  const result = parsePrimeBodyV02(primeSource.replace('  Output: JMAppReceipt.v0.1', '  Output: A\n  Output: B'));
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.diagnostics.duplicate_organs, ['Output']);
});

gate('PrimeBody refuses unknown organs instead of silently swallowing them', () => {
  const result = parsePrimeBodyV02(primeSource.replace('  Output:', '  MysteryBody: x\n  Output:'));
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.diagnostics.unknown_organs, ['MysteryBody']);
});

gate('Recovered-spec claim boundary stays explicit', () => {
  const result = parsePrimeBodyV02(primeSource);
  assert.match(result.claimBoundary, /not byte-recovered historical parser source/i);
});

console.log(`DING PRIMEBODY_TOKENBODY_WAVE_2 ${passed}/12 PASS`);
