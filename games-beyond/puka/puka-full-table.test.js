'use strict';
const fs=require('fs');
const path=require('path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const html=read('00_OPEN_FIRST.html');
const core=read('puka-core.js');
const ui=read('puka-ui.js');
const css=read('puka-v12.css');
const sw=read('sw.js');
const registry=read('registry.json');
const receipt=read('BUILD_RECEIPT.md');

assert(html.includes('PUKA v0.12A'),'v0.12A front-door marker missing');
assert(html.includes('puka-v12.css'),'v0.12A presentation layer not linked');
assert(html.includes('id="raiseTray"'),'raise sizing tray missing');
assert(html.includes('id="equity"')&&html.includes('id="priceRead"'),'teacher equity/price fields missing');
assert(html.includes('id="historyList"')&&html.includes('id="reviewLine"'),'history/review surfaces missing');
assert(html.includes("it does not inspect House Mind's hidden cards"),'visible-equity honesty boundary missing from front door');

assert(core.includes('PUKA CORE v0.12A'),'v0.12A core marker missing');
assert(core.includes('function estimateEquity('),'visible-card equity estimator missing');
assert(core.includes('function validSavedState('),'validated lifecycle restore missing');
assert(core.includes("version:'0.12A'"),'v0.12A persistent-state marker missing');
assert(core.includes('raiseOptions(')&&core.includes('normalizeRaiseTarget('),'sized raise core missing');
assert(core.includes('runoutToShowdown('),'all-in runout closure missing');
assert(core.includes('houseHole:revealed?'),'history reveal boundary missing');
assert(core.includes("method:'visible-card estimate'"),'equity estimate must remain explicitly labelled as estimate');

assert(ui.includes("'jm-puka-v12a'"),'v0.12A storage authority missing');
assert(ui.includes("game.playerAction('raise',Number(b.dataset.raiseTo))"),'raise tray is not wired to core sizing');
assert(ui.includes("addEventListener('pagehide',save"),'pagehide persistence contact missing');
assert(ui.includes('renderHistory()')&&ui.includes('renderMastery()'),'history/mastery rendering missing');
assert(ui.includes("const hideAI=!s.ended||s.endReason==='fold'"),'folded hand must keep House cards hidden in presentation');

assert(css.includes('.raise-tray'),'raise tray presentation missing');
assert(css.includes('.raise-size{min-width:44px;min-height:44px}'),'v0.12 raise contact floor missing');
assert(css.includes('.mastery')&&css.includes('.hand-review'),'quiet mastery/review bodies missing');

assert(sw.includes("const CACHE='jm-puka-v12a'"),'service worker cache not advanced to v0.12A');
assert(sw.includes("'./puka-v12.css'"),'v0.12A presentation layer not cached');
assert(registry.includes('JM.PUKA.Room/0.12A'),'v0.12A registry schema missing');
assert(registry.includes('Estimate != hidden fact'),'registry estimate/fact law missing');
assert(receipt.includes('FULL TABLE LEARNING LOOP BUILD RECEIPT'),'v0.12A build receipt missing');

console.log('PUKA v0.12A FULL TABLE SOURCE DING PASS');
