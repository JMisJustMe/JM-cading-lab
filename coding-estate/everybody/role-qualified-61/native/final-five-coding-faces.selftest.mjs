import assert from 'node:assert/strict';
import { GameForge, GlyphForge, GlyphPlay, Playform, Visualang, FINAL_FIVE_AUTHORITY } from './final-five-coding-faces.mjs';

const checks=[]; function check(name,fn){fn();checks.push(name);}
const game=`gameforge Arena {\nmechanic guard using game-coding route game.guard\nscene duel uses guard\nbuild crown from duel\n}`;
const glyphForge=`glyphforge Marks {\nglyph LEFT = "<" means move.left\nglyph FIRE = "*" means action.fire\ncompose STRIKE = LEFT + FIRE route combo.strike\n}`;
const glyphPlay=`glyphplay Arena {\nbind "*" -> fire\non fire state projectile = "spawned"\n}`;
const playform=`playform Crown {\nmode build\nroom story holds story-graph\nroom visual holds visualang\nroom output holds standalone-html\nroute story -> visual\nroute visual -> output\n}`;
const visual=`visualang Dog {\norgan body form capsule\norgan head form circle\nrelation head -> body\nbehaviour head on tap route dog.look\n}`;

check('gameforge-exact-authority-bound',()=>assert.equal(FINAL_FIVE_AUTHORITY.gameforge.sha256,'a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb'));
check('gameforge-production-route',()=>assert.equal(GameForge.execute(game,'crown').runtime.donor,'game-coding'));
check('gameforge-rejects-missing-mechanic',()=>assert.throws(()=>GameForge.parse(`gameforge Bad {\nscene x uses none\nbuild y from x\n}`),/mechanic/));
check('glyphforge-exact-authority-bound',()=>assert.equal(FINAL_FIVE_AUTHORITY.glyphforge.bytes,108992));
check('glyphforge-composition',()=>assert.deepEqual(GlyphForge.execute(glyphForge,'STRIKE').runtime.marks,['<','*']));
check('glyphforge-rejects-missing-parts',()=>assert.throws(()=>GlyphForge.parse(`glyphforge Bad {\nglyph A = "a" means a\ncompose X = A + B route x\n}`),/parts/));
check('glyphplay-state-consequence',()=>assert.equal(GlyphPlay.execute(glyphPlay,'*',{}).runtime.after.projectile,'spawned'));
check('glyphplay-requires-real-state-change',()=>assert.equal(GlyphPlay.execute(glyphPlay,'*',{}).runtime.stateChanged,true));
check('playform-exact-frozen-authority-bound',()=>assert.equal(FINAL_FIVE_AUTHORITY.playform.sha256,'60da0d1f303a1e17d3580d3261123bbdd51f9f7022199fee0f502fa60e70839d'));
check('playform-room-orchestration',()=>assert.equal(Playform.execute(playform,'story','visual').runtime.landingBody,'visualang'));
check('playform-preserves-playzone-boundary',()=>assert.equal(Playform.execute(playform,'visual','output').runtime.playZoneBoundary,'protected'));
check('visualang-addressable-organs',()=>assert.deepEqual(Visualang.execute(visual,'head','tap').runtime.addressableOrgans,['body','head']));
check('visualang-form-behaviour-route',()=>assert.equal(Visualang.execute(visual,'head','tap').runtime.route,'dog.look'));
check('visualang-native-order',()=>assert.match(Visualang.execute(visual,'head','tap').runtime.nativeOrder,/INTENTION->BODY->RELATION->FORM/));
check('final-five-source-boundaries-distinct',()=>assert.equal(new Set(Object.values(FINAL_FIVE_AUTHORITY).map(x=>x.status)).size>=3,true));

console.log(JSON.stringify({schema:'jm.final-five-coding-faces-selftest/1.0',passed:true,checks:checks.length,identities:['GameForge','GlyphForge','GlyphPlay','PLAYFORM','JM Visualang'],checkNames:checks},null,2));
