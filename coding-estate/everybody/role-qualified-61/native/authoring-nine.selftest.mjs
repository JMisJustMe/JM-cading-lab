import assert from 'node:assert/strict';
import { CadingLab, CadenPad, CodingBodyHouse, FingerOne, FingerOneCodeStudio, FingerTwo, Lexicon, NameBank, CodeingEngine, AUTHORING_NINE_BOUNDARY } from './authoring-nine.mjs';

const checks=[];
function check(name, fn){ fn(); checks.push(name); }

const lab=`cadinglab Main {\nmount cading as core\ntrial smoke using core\npromote smoke if ding\n}`;
const pad=`cadenpad Work {\nopen cading\nrun cading\ninspect cading\nreceipt cading\n}`;
const house=`codinghouse Estate {\nroom syntax => cading\nroom runtime => routevm\nroute syntax -> runtime\n}`;
const f1=`fingerone Primary {\nselect cading\nroute cading -> routevm\n}`;
const studio=`codestudio GripCube {\nproject demo\nmount cading\ntrial smoke with cading\n}`;
const f2=`fingertwo Embodied {\nbind mudra mudra-code\nbind morseminus mmzg\nsequence mudra > morseminus\n}`;
const lex=`lexicon Terms {\nterm ding = "earned contact" route proof.ding\n}`;
const bank=`namebank Names {\nname Cading id cading\nalias Theomidul -> Cading\n}`;
const engine=`codeingengine Pipeline {\nfrontend cading\nir onebody-ir\nbackend javascript\n}`;

check('boundary-9-distinct',()=>assert.equal(new Set(AUTHORING_NINE_BOUNDARY.bodies).size,9));
check('cading-lab-parse',()=>assert.equal(CadingLab.parse(lab).type,'CadingLabProgram'));
check('cading-lab-ding-promotion',()=>assert.equal(CadingLab.execute(lab,'smoke',true).runtime.promoted,true));
check('cadenpad-parse',()=>assert.equal(CadenPad.parse(pad).ops.length,4));
check('cadenpad-open-first-runtime',()=>assert.equal(CadenPad.execute(pad).runtime.output.at(-1).status,'ok'));
check('coding-house-preserves-room-identities',()=>assert.equal(CodingBodyHouse.execute(house,'syntax','runtime').runtime.preservedIdentity,true));
check('coding-house-rejects-unknown-room-route',()=>assert.throws(()=>CodingBodyHouse.parse(`codinghouse Bad {\nroom a => cading\nroute a -> z\n}`),/Route endpoints/));
check('finger-one-selection-route',()=>assert.equal(FingerOne.execute(f1).runtime.target,'routevm'));
check('codestudio-project-trial',()=>assert.equal(FingerOneCodeStudio.execute(studio,'smoke').runtime.project,'demo'));
check('codestudio-rejects-unmounted-trial',()=>assert.throws(()=>FingerOneCodeStudio.parse(`codestudio Bad {\nproject x\nmount cading\ntrial t with nope\n}`),/mounted/));
check('finger-two-embodied-route',()=>assert.deepEqual(FingerTwo.execute(f2).runtime.route.map(x=>x.kind),['mudra','morseminus']));
check('finger-two-rejects-unbound-kind',()=>assert.throws(()=>FingerTwo.parse(`fingertwo Bad {\nbind mudra mudra-code\nsequence formula\n}`),/unbound/));
check('lexicon-executable-term',()=>assert.equal(Lexicon.execute(lex,'ding').runtime.route,'proof.ding'));
check('lexicon-rejects-unknown',()=>assert.throws(()=>Lexicon.execute(lex,'missing'),/Unknown term/));
check('namebank-alias-resolution',()=>assert.deepEqual(NameBank.execute(bank,'Theomidul').runtime,{...NameBank.execute(bank,'Theomidul').runtime,canonical:'Cading'}));
check('namebank-collision-protection',()=>assert.throws(()=>NameBank.parse(`namebank Bad {\nname A id a\nname A id b\n}`),/Duplicate canonical/));
check('codeing-engine-pipeline',()=>assert.equal(CodeingEngine.execute(engine,'SOURCE').runtime.artifact.ir,'onebody-ir'));
check('codeing-engine-source-authority-boundary',()=>assert.equal(CodeingEngine.execute(engine,'SOURCE').runtime.sourceAuthority,'external-to-engine'));

const receipt={schema:'jm.authoring-nine-selftest/1.0',passed:true,checks:checks.length,identities:AUTHORING_NINE_BOUNDARY.bodies,checkNames:checks};
console.log(JSON.stringify(receipt,null,2));
