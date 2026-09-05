'use strict';
const C=document.getElementById('game'),ctx=C.getContext('2d'),W=720,H=920;
const $=id=>document.getElementById(id),now=()=>performance.now(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ui={
 coreTop:$('coreTop'),wakeTop:$('wakeTop'),wakeMini:$('wakeMini'),strataMini:$('strataMini'),coreFill:$('coreFill'),status:$('status'),feed:$('contactFeed'),
 lever:$('leverBtn'),leverText:$('leverText'),tension:$('tensionFill'),left:$('leftBtn'),right:$('rightBtn'),
 deep:$('deepBtn'),breath:$('breathBtn'),deepMeter:$('deepMeter'),breathMeter:$('breathMeter'),
 dropName:$('dropName'),speed:$('speedTag'),power:$('powerTag'),trait:$('traitTag'),center:$('centerReadout'),toast:$('toast'),
 dots:[...document.querySelectorAll('.dot')],phase:$('phaseRead'),chain:$('chainRead'),packageRead:$('packageRead'),
 ancientAuto:$('ancientAuto'),poolGrid:$('poolGrid'),
 leaderBtn:$('leaderBtn'),leaderName:$('leaderName'),leaderVerb:$('leaderVerb'),
 answerMain:$('answerMain'),answerSub:$('answerSub'),poolBtn:$('poolBtn'),weightedRead:$('weightedRead'),
 wakePool:$('wakePool')
};
const phases={sleep:'SLEEPFALL',reel:'BONE REEL',ready:'WAKE READY',aim:'WAKEFLICK',live:'LIVE WAKE',win:'CORE BROKEN'};
const creatures=[
 // Differences are tendencies, not cartoon extremes. Contact decides the exact answer.
 {id:'c1',name:'Rib Bouncer',short:'RIB',speed:1.00,power:7,trait:'REBOUND',fill:'#d6a257',
  mass:.96,gravity:.158,restitution:.67,drag:.9972,tangent:.94,maxSpeed:12.8,launch:1.00,spinCouple:.13,rebound:.22},
 {id:'c2',name:'Spine Toad',short:'SPINE',speed:.97,power:8,trait:'COMPRESS',fill:'#7da365',
  mass:1.08,gravity:.174,restitution:.50,drag:.9955,tangent:.90,maxSpeed:12.2,launch:.98,spinCouple:.07,spring:.42},
 {id:'c3',name:'Gust Ribbit',short:'GUST',speed:1.07,power:6,trait:'GLIDE',fill:'#58c7bf',
  mass:.82,gravity:.132,restitution:.46,drag:.9925,tangent:.90,maxSpeed:12.6,launch:1.06,spinCouple:.05,glide:.035},
 {id:'c4',name:'Shellwake',short:'SHELL',speed:.90,power:10,trait:'HEAVY',fill:'#ce9650',
  mass:1.34,gravity:.192,restitution:.39,drag:.9965,tangent:.87,maxSpeed:11.8,launch:.93,spinCouple:.03},
 {id:'c5',name:'Fossil Skitter',short:'SKIT',speed:1.02,power:5,trait:'SKITTER',fill:'#c3b06c',
  mass:.88,gravity:.152,restitution:.45,drag:.9895,tangent:.84,maxSpeed:12.2,launch:1.02,spinCouple:.18,skitter:.28}
];
const shards=[
 {id:'s1',name:'Spineshard',short:'SPINE',effect:'boost'},
 {id:'s2',name:'Ribshard',short:'RIB',effect:'split'},
 {id:'s3',name:'Amber Shard',short:'AMBER',effect:'charge'},
 {id:'s4',name:'River Shard',short:'RIVER',effect:'curve'}
];
const paths=[
 {id:'p1',name:'Left Bodypath',short:'LEFT',effect:'left'},
 {id:'p2',name:'Right Bodypath',short:'RIGHT',effect:'right'},
 {id:'p3',name:'Cross Bodypath',short:'CROSS',effect:'cross'},
 {id:'p4',name:'Deep Bodypath',short:'DEEP',effect:'deep'}
];
const instincts=[
 {id:'i1',name:'Deep Call',short:'DEEP',effect:'deep'},
 {id:'i2',name:'Breathgate',short:'BREATH',effect:'breath'}
];
const leaders=[
 {id:'kael',name:'Kael',verb:'REBOUND',line:'contact returns',restitution:.035,reflex:1.045,mass:1,gravity:1,launch:1.015,pathWidth:0,slip:1,core:1,memory:'RETURN'},
 {id:'elior',name:'Elior',verb:'RECEIVE',line:'absorb · return later',restitution:-.035,reflex:.98,mass:1.025,gravity:.99,launch:.99,pathWidth:0,slip:1,core:1,memory:'RECEIVE'},
 {id:'nyx',name:'Nyx',verb:'SLIP',line:'escape the obvious route',restitution:-.015,reflex:1,mass:.97,gravity:.985,launch:1.01,pathWidth:4,slip:1.10,core:.98,memory:'SLIP'},
 {id:'orun',name:'Orun',verb:'SINK',line:'weight becomes pressure',restitution:-.025,reflex:.96,mass:1.07,gravity:1.045,launch:.97,pathWidth:0,slip:.95,core:1.10,memory:'SINK'},
 {id:'mara',name:'Mara',verb:'HOLD',line:'survive one more fall',restitution:-.015,reflex:.98,mass:1.035,gravity:.99,launch:.99,pathWidth:0,slip:1,core:1.02,memory:'HOLD'},
 {id:'sola',name:'Sola',verb:'SURGE',line:'pressure becomes motion',restitution:.015,reflex:1.025,mass:.98,gravity:1.01,launch:1.045,pathWidth:0,slip:1.03,core:1.04,memory:'SURGE'},
 {id:'tavi',name:'Tavi',verb:'MAP',line:'routes become readable',restitution:0,reflex:1,mass:1,gravity:1,launch:1,pathWidth:8,slip:1,core:1,memory:'GUIDE'}
];
const pieces=[...creatures.map(x=>({...x,cat:'creature'})),...shards.map(x=>({...x,cat:'shard'})),...paths.map(x=>({...x,cat:'path'})),...instincts.map(x=>({...x,cat:'instinct'}))];
const weights=Object.fromEntries(pieces.map(p=>[p.id,1]));
const fossils=[
 {id:'f1',x:185,y:245,r:29,hitR:40,c:'teal',link:'left',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0},{id:'f2',x:265,y:322,r:25,hitR:36,c:'teal',link:'cross',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0},
 {id:'f3',x:535,y:245,r:29,hitR:40,c:'amber',link:'right',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0},{id:'f4',x:455,y:322,r:25,hitR:36,c:'amber',link:'deep',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0},
 {id:'f5',x:150,y:445,r:31,hitR:42,c:'teal',link:'left',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0},{id:'f6',x:570,y:445,r:31,hitR:42,c:'amber',link:'right',awake:false,pulse:0,kickUntil:0,memory:null,memoryCharge:0}
];
const bodypaths=[
 {kind:'left',awake:false,open:false,pulse:0,kickUntil:0},
 {kind:'right',awake:false,open:false,pulse:0,kickUntil:0},
 {kind:'cross',awake:false,open:false,pulse:0,kickUntil:0},
 {kind:'deep',awake:false,open:false,pulse:0,kickUntil:0}
];
const core={x:360,y:178,r:54};
const shardGates=[{x:270,y:455,ang:-.48,used:false},{x:450,y:455,ang:.48,used:false},{x:360,y:605,ang:0,used:false}];

// Dead space becomes live anatomy. These are board organs, not decorative side panels.
const sideOrgans=[
 {id:'archive',side:'L',x:82,y:292,r:23,label:'ARCHIVE',sub:'store / release',awake:false,pulse:0,cool:0,stored:null,usedWake:false,storedCreature:null},
 {id:'route',side:'L',x:82,y:492,r:23,label:'ROUTE',sub:'bend the answer',awake:false,pulse:0,cool:0,stored:null,usedWake:false,storedCreature:null},
 {id:'reel',side:'R',x:638,y:292,r:23,label:'FOSSIL REEL',sub:'re-answer shard',awake:false,pulse:0,cool:0,stored:null,usedWake:false,storedCreature:null},
 {id:'port',side:'R',x:638,y:492,r:23,label:'WAKE PORT',sub:'return + reveal',awake:false,pulse:0,cool:0,stored:null,usedWake:false,storedCreature:null}
];

// Central route can be excavated, while side routes remain valid alternatives.
const sediments=[
 {id:'sed1',name:'LOST BONES',y:665,x1:218,x2:502,h:22,maxHp:18,hp:18,broken:false,pulse:0,weakX:334},
 {id:'sed2',name:'BURIED TRUTHS',y:590,x1:205,x2:515,h:22,maxHp:22,hp:22,broken:false,pulse:0,weakX:418},
 {id:'sed3',name:'SPECIES RECORD',y:515,x1:218,x2:502,h:22,maxHp:26,hp:26,broken:false,pulse:0,weakX:296},
 {id:'sed4',name:'LIVING MEMORY',y:440,x1:232,x2:488,h:22,maxHp:30,hp:30,broken:false,pulse:0,weakX:385}
];
