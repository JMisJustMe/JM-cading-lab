import assert from 'node:assert/strict';
import {auditRegister,listCandidateContacts,comparePrivateEvidence,SCHEMA,TARGETS} from './influence-core.mjs';
import {executeNativeEvidenceContact} from './native-playform-contact.mjs';
const synthetic={schema:'jm.gaming-influence-register.v1.1',counts:{games_identified:3,unresolved:1},
  games:[
    {'Game title':'Rumble Stars Football','Evidence class':'Direct game title in Takeout','First recorded install':'2026-09-15','Latest recorded install':'2026-09-15','Install records':1,'Raw source path':'synthetic/Installs.json','Recorded devices':'DO_NOT_LEAK'},
    {'Game title':'Rumble Hockey','Evidence class':'Direct game title in Takeout','First recorded install':'2026-01-01','Latest recorded install':'2026-01-02','Install records':2,'Raw source path':'synthetic/Installs.json'},
    {'Game title':'Unmapped Game','Evidence class':'Direct game title in Takeout','First recorded install':'2025-01-01','Latest recorded install':'2025-01-01','Install records':1,'Raw source path':'synthetic/Installs.json'}],
  unresolved:[{'package':'synthetic.package'}]};
let checks=0;
const check=(cb)=>{cb();checks++};
const prior=JSON.stringify(synthetic);
check(()=>assert.deepEqual(auditRegister(synthetic),{identified:3,unresolved:1}));
check(()=>assert.equal(listCandidateContacts(synthetic).length,2));
check(()=>assert.equal(comparePrivateEvidence(synthetic,'Rumble Stars Football').schema,SCHEMA));
check(()=>assert.equal(comparePrivateEvidence(synthetic,'Rumble Stars Football').relationship.jmEstateRoute,'Aim / Drag / Cannon Loop'));
check(()=>assert.equal(comparePrivateEvidence(synthetic,'Unmapped Game').relationship,null));
check(()=>assert.equal(comparePrivateEvidence(synthetic,'Unmapped Game').ownerLiked,'UNKNOWN_NOT_OWNER_CONFIRMED'));
check(()=>assert.equal(JSON.stringify(comparePrivateEvidence(synthetic,'Rumble Stars Football')).includes('DO_NOT_LEAK'),false));
check(()=>assert.throws(()=>comparePrivateEvidence(synthetic,'not installed'),/TITLE_NOT_IN_PRIVATE_EXPORT/));
check(()=>assert.throws(()=>auditRegister({...synthetic,counts:{...synthetic.counts,games_identified:4}}),/REGISTER_COUNT_MISMATCH/));
check(()=>assert.throws(()=>auditRegister({...synthetic,unresolved:[]}),/UNRESOLVED_COUNT_MISMATCH/));
check(()=>assert.throws(()=>auditRegister({...synthetic,games:[...synthetic.games,synthetic.games[0]],counts:{games_identified:4,unresolved:1}}),/DUPLICATE_TITLE/));
check(()=>assert.equal(Object.keys(TARGETS).length,10));
const gameWorld={simulation:{score:17,entities:[{id:'P1',x:9,y:7}]}};
const priorWorld=JSON.stringify(gameWorld);
const contact=executeNativeEvidenceContact(synthetic,'Rumble Stars Football',gameWorld);
check(()=>assert.equal(contact.nativeEngine,'JM PLAYFORM sovereign source'));
check(()=>assert.equal(contact.nativeTrace[0].body,'PLAYFORM'));
check(()=>assert.equal(contact.nativeReceipt.body,'PLAYFORM'));
check(()=>assert.equal(contact.state.research.influenceContact.value.relationship.jmEstateRoute,'Aim / Drag / Cannon Loop'));
check(()=>assert.equal(JSON.stringify(gameWorld),priorWorld));
check(()=>assert.deepEqual(contact.state.simulation,gameWorld.simulation));
check(()=>assert.equal(JSON.stringify(synthetic),prior));
check(()=>assert.equal(contact.gameRuntimeInvoked,false));
check(()=>assert.equal(contact.rendererInvoked,false));
check(()=>assert.equal(contact.gardlesInvoked,false));
const fallback=executeNativeEvidenceContact(synthetic,'Unmapped Game');
check(()=>assert.equal(fallback.state.research.influenceContact.region,'evidence'));
check(()=>assert.equal(fallback.state.research.influenceContact.type,'inspect'));
console.log(JSON.stringify({schema:'jm.game-influence-native-test/0.1',checks,failures:0,
  nativeSource:'coding-estate/sovereign-batch-six/direct/game-input-native-b.mjs',
  gameSimulation:'NOT_INVOKED',renderer:'NOT_INVOKED',gardles:'NOT_INVOKED',
  result:'HOST_NATIVE_PLAYFORM_RESEARCH_CONTACT_ONLY'},null,2));
