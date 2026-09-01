(()=>{
'use strict';
const NS=window.JMVisualCampaign=window.JMVisualCampaign||{};
const boot=window.__JMVC_BOOT__||{};
const STORAGE='jm-game-engine-army-visual-v03';
const defaults={theme:'obsidian-forge',particles:true,routeTrails:true,sound:true,volume:.28,haptics:true,highContrast:false,largeTouch:false,reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false,quality:'auto',debug:false};
const parse=value=>{try{return JSON.parse(value)}catch{return null}};
const saved=parse(localStorage.getItem(STORAGE)||'null')||{};
NS.version='0.3';
NS.boot=boot;
NS.engine=boot.id||document.documentElement.dataset.jmvcEngine||'unknown';
NS.settings={...defaults,...saved};
NS.listeners=new Map();
NS.state={ready:false,lastSignal:'READY',qualityTier:2,fps:60,frameMs:16.7,interactions:0,startedAt:Date.now()};
NS.themes={
 'obsidian-forge':{label:'Obsidian Forge',bg:'#05080f',panel:'#0d1724',ink:'#f7fbff',muted:'#98adc1'},
 'aurora-circuit':{label:'Aurora Circuit',bg:'#031017',panel:'#092431',ink:'#f4ffff',muted:'#91cbd2'},
 'paper-glyph':{label:'Paper Glyph',bg:'#e9e1cf',panel:'#fffaf0',ink:'#1d2230',muted:'#675f52'},
 'high-energy':{label:'High Energy',bg:'#100414',panel:'#26102f',ink:'#fff6ff',muted:'#d8aada'}
};
NS.on=(name,fn)=>{const list=NS.listeners.get(name)||[];list.push(fn);NS.listeners.set(name,list);return()=>NS.listeners.set(name,(NS.listeners.get(name)||[]).filter(x=>x!==fn))};
NS.emit=(name,detail={})=>{for(const fn of NS.listeners.get(name)||[]){try{fn(detail)}catch(error){console.warn('JMVC listener fault',name,error)}}document.dispatchEvent(new CustomEvent('jmvc:'+name,{detail}))};
NS.save=()=>{localStorage.setItem(STORAGE,JSON.stringify(NS.settings));NS.applySettings();NS.emit('settings',NS.settings)};
NS.set=(key,value)=>{NS.settings[key]=value;NS.save()};
NS.applySettings=()=>{
 const root=document.documentElement,theme=NS.themes[NS.settings.theme]||NS.themes['obsidian-forge'];
 root.dataset.jmvcTheme=NS.settings.theme;
 root.dataset.jmvcContrast=NS.settings.highContrast?'high':'normal';
 root.dataset.jmvcTouch=NS.settings.largeTouch?'large':'normal';
 root.dataset.jmvcMotion=NS.settings.reducedMotion?'reduced':'full';
 root.style.setProperty('--jmvc-bg',theme.bg);root.style.setProperty('--jmvc-panel',theme.panel);root.style.setProperty('--jmvc-ink',theme.ink);root.style.setProperty('--jmvc-muted',theme.muted);
};
NS.download=(name,text,type='application/json')=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)};
NS.visualReceipt=()=>({
 schema:'jm.game-engine-army.visual-receipt/0.3',engine:NS.engine,package:boot.package||null,version:NS.version,theme:NS.settings.theme,settings:{...NS.settings},qualityTier:NS.state.qualityTier,fps:Math.round(NS.state.fps),signal:NS.state.lastSignal,interactions:NS.state.interactions,generatedAt:new Date().toISOString(),claimBoundary:'Visual browser receipt only; simulation receipts remain authoritative.'
});
NS.applySettings();
})();
