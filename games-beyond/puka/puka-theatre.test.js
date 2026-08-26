'use strict';
const fs=require('fs');
const theatre=fs.readFileSync(__dirname+'/puka-table-theatre-v09.js','utf8');
const css=fs.readFileSync(__dirname+'/puka-v09.css','utf8');
const html=fs.readFileSync(__dirname+'/00_OPEN_FIRST.html','utf8');
const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
const dealer=fs.readFileSync(__dirname+'/assets/puka-dealer-medallion-v09.svg','utf8');
const runway=fs.readFileSync(__dirname+'/assets/puka-board-runway-v09.svg','utf8');
const fail=m=>{throw new Error(m)};
const has=(body,needle,msg)=>{if(!body.includes(needle))fail(msg)};

has(html,'puka-v09.css','v0.9 theatre CSS not mounted');
has(html,'puka-table-theatre-v09.js','v0.9 theatre JS not mounted');
has(html,'data-dealer-seat="none"','dealer presentation dataset seed missing');
has(html,'data-table-street="ready"','street presentation dataset seed missing');
has(sw,"const CACHE='jm-puka-",'PUKA service-worker cache family missing');
for(const asset of ['puka-v09.css','puka-table-theatre-v09.js','puka-dealer-medallion-v09.svg','puka-board-runway-v09.svg']) has(sw,asset,`${asset} not cached`);

has(theatre,"document.querySelector('#dealerLine')",'theatre must read visible dealer label');
has(theatre,"state.querySelector('.pot small')",'theatre must read visible street label');
has(theatre,"root.dataset.dealerSeat",'dealer-seat presentation route missing');
has(theatre,"root.dataset.tableStreet",'street presentation route missing');
has(theatre,'MutationObserver','theatre remount observer missing');
if(theatre.includes('PUKA.')||theatre.includes('game.snapshot')||theatre.includes('game.state')||theatre.includes('players.ai.hole')) fail('theatre organ must not read hidden poker state');

has(css,'table theatre and focal-composition layer','v0.9 theatre source marker missing');
has(css,'puka-dealer-medallion-v09.svg','dealer medallion art not mounted');
has(css,'puka-board-runway-v09.svg','community runway art not mounted');
has(css,"html[data-dealer-seat='house'] .dealer-medallion",'House dealer route missing');
has(css,"html[data-dealer-seat='you'] .dealer-medallion",'player dealer route missing');
has(css,"html[data-table-street='river']",'river focal escalation missing');
has(css,"html[data-puka-mode='royal'] .seat-plate",'Royal seat architecture missing');
has(css,"html[data-puka-mode='portrait'] .board",'Portrait theatre route missing');
has(css,'@media(max-width:360px)','v0.9 narrow-phone guard missing');
has(css,'@media(max-height:560px) and (orientation:landscape)','v0.9 short-landscape guard missing');
has(css,'@media(prefers-reduced-motion:reduce)','v0.9 reduced-motion guard missing');

has(dealer,'PUKA dealer medallion','dealer asset accessibility label missing');
has(runway,'PUKA community card runway','runway asset accessibility label missing');
console.log('PUKA v0.9A TABLE THEATRE SOURCE DING PASS');
