(()=>{
'use strict';
const NS=window.JMVisualCampaign;
const engines={
 glyphplay:{name:'GlyphPlay',role:'World Builder',accent:'#55e8ff',accent2:'#ffd35a',danger:'#ff6f7d',motion:'drift',symbol:'◇'},
 gameforge:{name:'GameForge',role:'Compilation Workshop',accent:'#ffb04f',accent2:'#65eaff',danger:'#ff6577',motion:'scan',symbol:'⬡'},
 glyphforge:{name:'GlyphForge',role:'Asset + Control Forge',accent:'#ff67d4',accent2:'#55f0ff',danger:'#ff6b78',motion:'pixel',symbol:'▦'},
 playform:{name:'PLAYFORM',role:'Repeatable Loop Chamber',accent:'#c69cff',accent2:'#ffd166',danger:'#ff6f7d',motion:'orbit',symbol:'∞'},
 jmgamecore:{name:'JM GameCore',role:'Identity-Preserving Service Core',accent:'#60d6ff',accent2:'#76ffb2',danger:'#ff6b78',motion:'bus',symbol:'◉'},
 'jm-game-native-core':{name:'JM GAME NATIVE CORE',role:'Deterministic Simulation Core',accent:'#ff8b5c',accent2:'#ffd166',danger:'#ff4d64',motion:'tick',symbol:'▣'},
 'kading-game-estate-engine':{name:'Kading Game Estate Engine',role:'Language-Driven Game Runtime',accent:'#7dffb1',accent2:'#ffe082',danger:'#ff6b78',motion:'glyph',symbol:'K'},
 'jm-game-engine-console':{name:'JM Game Engine Console',role:'Operator Deck',accent:'#72e6ff',accent2:'#bca7ff',danger:'#ff6b78',motion:'console',symbol:'⌘'},
 'army-federation':{name:'Army Federation',role:'Nine-Body Handoff Field',accent:'#7fffb0',accent2:'#ffcf66',danger:'#ff6b78',motion:'relay',symbol:'⇄'}
};
NS.profile=engines[NS.engine]||{name:NS.boot.name||NS.engine,role:NS.boot.role||'Engine Body',accent:'#65eaff',accent2:'#ffd166',danger:'#ff6b78',motion:'drift',symbol:'◇'};
const safe=fn=>{try{return fn()}catch{return null}};
NS.readEngineState=()=>{
 if(NS.engine==='glyphplay'&&window.GlyphPlayApp)return safe(()=>window.GlyphPlayApp.project());
 if(NS.engine==='gameforge'&&window.GameForgeApp)return safe(()=>({state:window.GameForgeApp.state(),cartridge:window.GameForgeApp.cartridge()}));
 if(NS.engine==='glyphforge'&&window.GlyphForgeApp)return safe(()=>({state:window.GlyphForgeApp.state(),adapter:window.GlyphForgeApp.adapter(),negotiation:window.GlyphForgeApp.negotiation?.()}));
 if(NS.engine==='playform'&&window.PLAYFORMApp)return safe(()=>({state:window.PLAYFORMApp.state(),compiled:window.PLAYFORMApp.compiled()}));
 const out=document.querySelector('#out');
 return out?parseOutput(out.textContent):null;
};
function parseOutput(text){try{return JSON.parse(text)}catch{return{text:text?.slice(0,800)||''}}}
NS.stateSummary=()=>{
 const data=NS.readEngineState();
 if(!data)return{label:'READY',detail:NS.profile.role};
 if(NS.engine==='glyphplay')return{label:data.runtime?.state||'ACTIVE',detail:`${data.bodyLens||'glyphplay'} · ${data.scene?.entities?.length||0} entities`};
 if(NS.engine==='gameforge')return{label:data.cartridge?'COMPILED':'EDIT',detail:`${data.state?.bodyId||'body'} · ${data.state?.coding||'route'}`};
 if(NS.engine==='glyphforge')return{label:data.adapter?'ADAPTED':'FORGE',detail:`${data.state?.target||'target'} · ${data.state?.assets?.length||0} assets`};
 if(NS.engine==='playform')return{label:data.state?.runtime?.state||'EDIT',detail:`${data.state?.coding||'native'} · cycle ${data.state?.runtime?.cycles||0}/2`};
 if(data.status)return{label:String(data.status),detail:NS.profile.role};
 return{label:'ACTIVE',detail:NS.profile.role};
};
const root=document.documentElement;root.dataset.jmvcEngine=NS.engine;root.style.setProperty('--jmvc-accent',NS.profile.accent);root.style.setProperty('--jmvc-accent2',NS.profile.accent2);root.style.setProperty('--jmvc-danger',NS.profile.danger);
})();
