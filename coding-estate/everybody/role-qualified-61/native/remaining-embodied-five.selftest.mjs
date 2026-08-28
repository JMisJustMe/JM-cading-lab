import assert from 'node:assert/strict';
import { Seedform, PrayerHands, JickMa, MoodDrills, MorseMinus, REMAINING_EMBODIED_BOUNDARY } from './remaining-embodied-five.mjs';

const checks=[]; function check(name,fn){fn();checks.push(name);}
const seed=`seedform Choice {\nchoice safe when mode = "safe" route route.safe\nchoice fast when mode = "fast" route route.fast\n}`;
const prayer=`prayerhands Pair {\npair confirm left palm right palm hold 200..600 route contact.confirm\n}`;
const jick=`jickma Reader {\nread calm from state mood as "steady" route state.calm\nread touch from contact kind as "contacted" route contact.read\n}`;
const mood=`mooddrills Regulate {\ndrill settle when mood tense do breathe > tap > release signal "settled"\n}`;
const morse=`morseminus Bindings {\nbind accept = .-_ to route.accept\nbind reject = _-. to route.reject\n}`;

check('five-distinct-identities',()=>assert.equal(new Set(REMAINING_EMBODIED_BOUNDARY.bodies).size,5));
check('seedform-choice',()=>assert.equal(Seedform.execute(seed,{mode:'safe'}).runtime.route,'route.safe'));
check('seedform-rejects-no-choice',()=>assert.throws(()=>Seedform.execute(seed,{mode:'none'}),/exactly one/));
check('prayer-hands-paired-contact',()=>assert.equal(PrayerHands.execute(prayer,{left:'palm',right:'palm',hold:300}).runtime.matched,true));
check('prayer-hands-rejects-short-hold',()=>assert.equal(PrayerHands.execute(prayer,{left:'palm',right:'palm',hold:50}).runtime.matched,false));
check('jickma-reads-state',()=>assert.equal(JickMa.execute(jick,'state',{mood:'tense'}).runtime.meaning,'steady'));
check('jickma-does-not-mutate',()=>assert.equal(JickMa.execute(jick,'contact',{kind:'physical'}).runtime.interpretationNotMutation,true));
check('mood-drill-matches-sequence',()=>assert.equal(MoodDrills.execute(mood,'tense',['breathe','tap','release']).runtime.signal,'settled'));
check('mood-drill-fails-wrong-sequence',()=>assert.equal(MoodDrills.execute(mood,'tense',['tap']).runtime.matched,false));
check('morseminus-binds-route',()=>assert.equal(MorseMinus.execute(morse,'.-_').runtime.route,'route.accept'));
check('morseminus-is-not-zerogrip',()=>assert.equal(MorseMinus.execute(morse,'.-_').runtime.zeroGrip,false));
check('morseminus-rejects-pattern-collision',()=>assert.throws(()=>MorseMinus.parse(`morseminus Bad {\nbind a = .-_ to a\nbind b = .-_ to b\n}`),/Duplicate binding/));

console.log(JSON.stringify({schema:'jm.remaining-embodied-five-selftest/1.0',passed:true,checks:checks.length,identities:REMAINING_EMBODIED_BOUNDARY.bodies,checkNames:checks},null,2));
