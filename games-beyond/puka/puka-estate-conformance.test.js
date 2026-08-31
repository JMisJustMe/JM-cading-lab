'use strict';
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/00_OPEN_FIRST.html','utf8');
const css=fs.readFileSync(__dirname+'/puka-v11.css','utf8');
const css12=fs.readFileSync(__dirname+'/puka-v12.css','utf8');
const css13=fs.readFileSync(__dirname+'/puka-v13.css','utf8');
const deep=fs.readFileSync(__dirname+'/puka-deep-house-v13.js','utf8');
const ui=fs.readFileSync(__dirname+'/puka-ui.js','utf8');
const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
const registry=fs.readFileSync(__dirname+'/registry.json','utf8');
const workflow=fs.readFileSync(__dirname+'/../../.github/workflows/puka-live-proof.yml','utf8');
const browser=fs.readFileSync(__dirname+'/../tests/puka-estate-conformance.spec.mjs','utf8');
const fail=m=>{throw new Error(m)};
const has=(body,needle,msg)=>{if(!body.includes(needle))fail(msg)};

has(html,'PUKA v0.13A','v0.13A front-door marker missing');
has(html,'puka-v11.css','v0.11 conformance layer must remain mounted');
has(html,'puka-v12.css','v0.12 capability layer must remain mounted');
has(html,'puka-v13.css','v0.13 Deep House layer not mounted');
has(html,'puka-deep-house-v13.js','v0.13 Deep House organ not mounted');
has(html,'viewport-fit=cover','safe viewport-fit marker missing');
has(html,'class="skip-link"','skip-link door missing');
has(html,'href="#main"','skip-link must route to main play body');
has(html,'aria-live="polite"','live status announcement missing');
if(/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(html)) fail('zoom restriction is not allowed in the PUKA front door');

has(css,'button,summary{min-height:44px}','44px interaction floor missing');
for(const selector of ['.table-deal,','.deal,','.action,','.suit,','.quick-suit,','.intro summary,','.evidence summary{min-height:44px}']) has(css,selector,`qualified 44px contact guard missing: ${selector}`);
has(css,'.entry-suits button,.quick-suit{min-width:44px}','compact suit target width guard missing');
has(css,'env(safe-area-inset-top)','top safe-area route missing');
has(css,'env(safe-area-inset-bottom)','bottom safe-area route missing');
has(css,'@media(prefers-reduced-motion:reduce)','reduced-motion conformance guard missing');
has(css12,'.raise-size{min-width:44px;min-height:44px}','v0.12 raise contact floor missing');
has(css13,'--puka-d0','Deep House depth role D0 missing');
has(css13,'--puka-d3','Deep House depth role D3 missing');
has(css13,'min-height:max(300px','Deep House protected phone field floor missing');
has(css13,'puka-deep-house-lattice-v13.svg','Deep House field lattice missing');
has(css13,'@media(prefers-reduced-motion:reduce)','Deep House reduced-motion guard missing');
has(deep,"root.dataset.deepHouse='active'",'Deep House runtime activation marker missing');
has(deep,'root.dataset.contactConsequence','Deep House action consequence marker missing');
has(deep,'root.dataset.fieldContact','Deep House direct field-contact marker missing');

has(ui,"const hideAI=!s.ended||s.endReason==='fold'",'folded hands must not reveal House cards in presentation');
has(sw,"jm-puka-v13a",'v0.13 service-worker cache marker missing');
has(sw,'puka-v11.css','v0.11 conformance CSS not cached');
has(sw,'puka-v12.css','v0.12 capability CSS not cached');
has(sw,'puka-v13.css','v0.13 Deep House CSS not cached');
has(sw,'puka-deep-house-v13.js','v0.13 Deep House JS not cached');
has(registry,'JM.PUKA.Room/0.13A','v0.13 registry schema missing');

for(const marker of ['360,height:800','390,height:844','412,height:915','768,height:1024','844,height:390','1366,height:768','1440,height:900','1440,height:1000','scrollWidth','pageerror','console','data-puka-mode','data-next-hand','isMobile:mobile','hasTouch:touch','fullPage:false','protected PUKA table field','page.reload','data-open-raise','data-raise-to','history-row','data-deep-house','data-field-contact','data-contact-consequence']) has(browser,marker,`browser/visual acceptance marker missing: ${marker}`);
has(workflow,'puka-estate-conformance.spec.mjs','browser acceptance spec not invoked by proof rail');
has(workflow,'playwright install --with-deps chromium','Chromium proof environment missing');

console.log('PUKA v0.13A ESTATE + DEEP HOUSE CONFORMANCE SOURCE DING PASS');
