'use strict';
const fs=require('fs');
const css=fs.readFileSync(__dirname+'/puka.css','utf8');
const ui=fs.readFileSync(__dirname+'/puka-ui.js','utf8');
const html=fs.readFileSync(__dirname+'/00_OPEN_FIRST.html','utf8');
const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
const fail=m=>{throw new Error(m)};
const has=(body,needle,msg)=>{if(!body.includes(needle))fail(msg)};

has(css,'overflow-x:hidden','viewport overflow guard missing');
has(css,'Phone landscape: true royal composition','phone-landscape royal layout missing');
has(css,'@media(orientation:landscape) and (max-height:650px)','landscape height gate missing');
has(css,'grid-template-columns:150px minmax(0,1fr) 190px','royal mobile three-zone composition missing');
has(css,'.game{min-width:0;order:1}','table-first portrait order missing');
has(ui,"if(isPhone()) return matchMedia('(orientation: portrait)').matches?'portrait':'royal';",'phone orientation must select the presentation route');
has(ui,"$('#identityDetails').open=false",'identity drawer must not block the playfield');
has(ui,'data-quick-suit','ready-table quick suit selector missing');
has(html,'Rotate phone for Royal Table','orientation guidance missing');
has(html,'PUKA v0.3A','visual-reset version marker missing');
has(sw,"jm-puka-v03a",'service worker cache version not bumped');
has(sw,'assets/puka-card-back.svg','card-back asset not cached');
has(sw,'assets/royal-felt-medallion.svg','felt asset not cached');

console.log('PUKA LAYOUT SOURCE DING PASS');
