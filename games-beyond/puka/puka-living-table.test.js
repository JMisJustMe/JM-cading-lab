'use strict';
const fs=require('fs');
const living=fs.readFileSync(__dirname+'/puka-living-table-v10.js','utf8');
const css=fs.readFileSync(__dirname+'/puka-v10.css','utf8');
const html=fs.readFileSync(__dirname+'/00_OPEN_FIRST.html','utf8');
const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
const chip=fs.readFileSync(__dirname+'/assets/puka-chip-column-v10.svg','utf8');
const fail=m=>{throw new Error(m)};
const has=(body,needle,msg)=>{if(!body.includes(needle))fail(msg)};

has(html,'PUKA v0.11A','v0.11A current front-door marker missing');
has(html,'puka-v10.css','living-table CSS not mounted');
has(html,'puka-living-table-v10.js','living-table JS not mounted');
has(html,'data-board-count="0"','visible board-count dataset seed missing');
has(sw,'jm-puka-v11a','current cache marker missing');
for(const item of ['puka-v10.css','puka-living-table-v10.js','puka-chip-column-v10.svg']) has(sw,item,`${item} not cached`);

has(living,"label?.querySelector('span')",'player chip mass must derive from visible player label');
has(living,"pot.querySelector('b')",'pot chip mass must derive from visible pot text');
has(living,"board.querySelectorAll('.playing-card:not(.back)')",'board staging must derive from visible community cards');
has(living,'root.dataset.boardCount','visible board-count presentation route missing');
has(living,"card.dataset.pukaCourtFoil='1'",'rendered court-card foil marker missing');
has(living,'MutationObserver','living-table remount observer missing');
for(const forbidden of ['PUKA.','game.snapshot','game.state','players.ai.hole','deck[','communityDeck','holeCards']) if(living.includes(forbidden)) fail(`living-table organ must not read hidden poker state: ${forbidden}`);

has(css,'living-table physicality','v0.10 visual source marker missing');
has(css,'puka-chip-column-v10.svg','physical chip asset not mounted');
has(css,'.living-chip-bank','chip-bank visual body missing');
has(css,'.board.board-reveal-wave:after','visible board reveal wave missing');
has(css,"html[data-board-count='5']",'river board-count emphasis missing');
has(css,"data-puka-court-foil='1'",'court-card foil treatment missing');
has(css,"html[data-puka-mode='royal'][data-court-tier='throne']",'throne atmosphere route missing');
has(css,"html[data-puka-mode='portrait']",'Portrait living-table route missing');
has(css,'@media(max-width:360px)','v0.10 narrow-phone guard missing');
has(css,'@media(max-height:560px) and (orientation:landscape)','v0.10 short-landscape guard missing');
has(css,'@media(prefers-reduced-motion:reduce)','v0.10 reduced-motion guard missing');
has(chip,'PUKA physical chip column','chip asset accessibility label missing');

console.log('PUKA v0.10A LIVING TABLE SOURCE DING PASS INSIDE v0.11A DESCENDANT');
