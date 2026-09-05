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

assert(html.includes('PUKA v0.16A'),'current v0.16A front-door marker missing');
assert(html.includes('puka-v12.css'),'v0.12 full-table presentation layer must remain linked');
assert(html.includes('puka-v13.css'),'v0.13 Deep House presentation layer must remain linked');
assert(html.includes('puka-human-game-v02.js'),'v0.14 Human Game reasoning organ must remain mounted above inherited full-table body');
assert(html.includes('puka-read-lab-v01.js'),'v0.15 Declared Read Lab must remain mounted above inherited full-table body');
assert(html.includes('puka-read-calibration-v01.js'),'v0.16 Counterread calibration must remain mounted above inherited full-table body');
assert(html.includes('id="raiseTray"'),'raise sizing tray missing');
assert(html.includes('id="equity"')&&html.includes('id="priceRead"'),'teacher equity/price fields missing');
assert(html.includes('id="historyList"')&&html.includes('id="reviewLine"'),'history/review surfaces missing');
assert(html.includes("it does not inspect House Mind's hidden cards"),'visible-equity honesty boundary missing from front door');

assert(core.includes('PUKA CORE v0.12A'),'v0.12A core authority marker missing');
assert(core.includes('function estimateEquity('),'visible-card equity estimator missing');
assert(core.includes('function validSavedState('),'validated lifecycle restore missing');
assert(core.includes("version:'0.12A'"),'v0.12A persistent-state marker missing');
assert(core.includes('raiseOptions(')&&core.includes('normalizeRaiseTarget('),'sized raise core missing');
assert(core.includes('runoutToShowdown('),'all-in runout closure missing');
assert(core.includes('houseHole:revealed?'),'history reveal boundary missing');
assert(core.includes("method:'visible-card estimate'"),'equity estimate must remain explicitly labelled as estimate');

assert(ui.includes("'jm-puka-v12a'"),'v0.12A local-storage authority missing');
assert(ui.includes("game.playerAction('raise',Number(b.dataset.raiseTo))"),'raise tray is not wired to core sizing');
assert(ui.includes("addEventListener('pagehide',save"),'pagehide persistence contact missing');
assert(ui.includes('renderHistory()')&&ui.includes('renderMastery()'),'history/mastery rendering missing');
assert(ui.includes("const hideAI=!s.ended||s.endReason==='fold'"),'folded hand must keep House cards hidden in presentation');

assert(css.includes('.raise-tray'),'raise tray presentation missing');
assert(css.includes('.raise-size{min-width:44px;min-height:44px}'),'v0.12 raise contact floor missing');
assert(css.includes('.mastery')&&css.includes('.hand-review'),'quiet mastery/review bodies missing');

assert(sw.includes("const CACHE='jm-puka-v16a'"),'service worker cache must advance with current descendant');
assert(sw.includes("'./puka-v12.css'"),'v0.12A presentation layer must remain cached');
assert(sw.includes("'./puka-v13.css'"),'v0.13A presentation layer must remain cached');
assert(sw.includes("'./puka-human-game-v02.js'"),'v0.14 Human Game reasoning organ must remain cached');
assert(sw.includes("'./puka-read-lab-v01.js'"),'v0.15 Declared Read Lab must remain cached');
assert(sw.includes("'./puka-read-calibration-v01.js'"),'v0.16 Counterread calibration must remain cached');
assert(registry.includes('JM.PUKA.Room/0.16A'),'current registry schema missing');
assert(registry.includes('Estimate != hidden fact'),'registry estimate/fact law missing');
assert(registry.includes('v12Changes'),'v0.12 learning-loop delta must remain receipted');
assert(registry.includes('v14Changes'),'v0.14 Human Game delta must remain receipted');
assert(registry.includes('v15Changes'),'v0.15 Declared Read delta must remain receipted');
assert(registry.includes('v16Changes'),'v0.16 Counterread delta must be receipted');
assert(receipt.includes('PUKA v0.16A'),'current v0.16A build receipt missing');
assert(receipt.includes("heads-up Texas Hold'em learning loop"),'build receipt must preserve the inherited full-table learning-loop capability');

console.log('PUKA v0.12A FULL TABLE SOURCE DING PASS INSIDE CURRENT v0.16A DESCENDANT');