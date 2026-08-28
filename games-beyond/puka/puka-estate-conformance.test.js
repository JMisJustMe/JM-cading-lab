'use strict';
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/00_OPEN_FIRST.html','utf8');
const css=fs.readFileSync(__dirname+'/puka-v11.css','utf8');
const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
const registry=fs.readFileSync(__dirname+'/registry.json','utf8');
const workflow=fs.readFileSync(__dirname+'/../../.github/workflows/puka-live-proof.yml','utf8');
const browser=fs.readFileSync(__dirname+'/../tests/puka-estate-conformance.spec.mjs','utf8');
const fail=m=>{throw new Error(m)};
const has=(body,needle,msg)=>{if(!body.includes(needle))fail(msg)};

has(html,'PUKA v0.11A','v0.11A front-door marker missing');
has(html,'puka-v11.css','v0.11 conformance layer not mounted');
has(html,'viewport-fit=cover','safe viewport-fit marker missing');
has(html,'class="skip-link"','skip-link door missing');
has(html,'href="#main"','skip-link must route to main play body');
has(html,'aria-live="polite"','live status announcement missing');
if(/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(html)) fail('zoom restriction is not allowed in the PUKA front door');

has(css,'button,summary{min-height:44px}','44px interaction floor missing');
has(css,'.intro summary,.evidence summary{min-height:44px}','drawer contact floor missing');
has(css,'env(safe-area-inset-top)','top safe-area route missing');
has(css,'env(safe-area-inset-bottom)','bottom safe-area route missing');
has(css,'@media(prefers-reduced-motion:reduce)','reduced-motion conformance guard missing');

has(sw,"jm-puka-v11a",'v0.11 service-worker cache marker missing');
has(sw,'puka-v11.css','v0.11 conformance CSS not cached');
has(registry,'JM.PUKA.Room/0.11A','v0.11 registry schema missing');

for(const marker of ['390,844','844,390','1440,1000','scrollWidth','pageerror','console','data-puka-mode','data-next-hand']) has(browser,marker,`browser acceptance marker missing: ${marker}`);
has(workflow,'puka-estate-conformance.spec.mjs','browser acceptance spec not invoked by proof rail');
has(workflow,'playwright install --with-deps chromium','Chromium proof environment missing');

console.log('PUKA v0.11A ESTATE CONFORMANCE SOURCE DING PASS');
