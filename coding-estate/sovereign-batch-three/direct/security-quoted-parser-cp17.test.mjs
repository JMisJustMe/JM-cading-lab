/** JM CP17: preserve original declarative syntax and reject overlapping regex alternatives. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {PunctBody, GlyphBody} from './field-primitives-native.mjs';
import {MorseMinus} from './embodied-native.mjs';

test('original PunctBody quoted punctuation and sequence semantics survive',()=>{
 const r=PunctBody.parse('punct bang "!" effect=complete\nsequence pair = [bang]');
 assert.equal(r.puncts[0].name,'bang');
 assert.equal(r.puncts[0].symbol,'!');
 assert.equal(r.sequences[0].members[0],'bang');
});
test('original GlyphBody quoted symbol and pressure routing survive',()=>{
 const r=GlyphBody.parse('glyph first "⚡" pressure=soft route=next');
 assert.equal(r.glyphs[0].symbol,'⚡');
 assert.equal(r.glyphs[0].route,'next');
});
test('original MorseMinus quoted pattern and route survive',()=>{
 const r=MorseMinus.parse('morse sos "...---..." route help');
 assert.equal(r.mappings[0].name,'sos');
 assert.equal(r.mappings[0].route,'help');
});
test('long malformed quoted PunctBody string is rejected in bounded time',()=>{
 const input='punct attack "'+'\\'.repeat(5000)+'x effect=complete';
 const start=performance.now();
 assert.throws(()=>PunctBody.parse(input));
 assert.ok(performance.now()-start<1800,'unbounded punctuation backtracking');
});
test('long malformed quoted GlyphBody string is rejected in bounded time',()=>{
 const input='glyph attack "'+'\\'.repeat(5000)+'x pressure=soft route=next';
 const start=performance.now();
 assert.throws(()=>GlyphBody.parse(input));
 assert.ok(performance.now()-start<1800,'unbounded glyph backtracking');
});
test('long malformed MorseMinus string is rejected in bounded time',()=>{
 const input='morse attack "'+'\\'.repeat(5000)+'x route=help';
 const start=performance.now();
 assert.throws(()=>MorseMinus.parse(input));
 assert.ok(performance.now()-start<1800,'unbounded MorseMinus backtracking');
});
