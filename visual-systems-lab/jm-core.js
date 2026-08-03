(()=>{
'use strict';
const STORE='jm.visual.lab.v0.1';
const now=()=>new Date().toISOString();
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=(p='JM')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

class JMOneBody{
  constructor(seed={}){
    this.identity={id:'jm-visual-systems-lab',name:'JM Estate — Visual Systems Lab',version:'0.1.0',status:'WORKING_BODY_NOT_CROWNED'};
    this.laws=['Connect does not mean merge','Source before treatment','Contact must cause readable state','No Ding, no claim','128×1–5 actual viewport fit','Recovery remains reachable'];
    this.routes=['illusion','image','video','motion','prompt','story'];
    this.state={route:'illusion',illusion:'muller',motion:'full',contacts:0,lastContact:null,story:[],seed,session:uid('SESSION')};
    this.trace=[];
    this.restore();
    this.contact('BODY_WAKE',{route:this.state.route,session:this.state.session},false);
  }
  restore(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      if(saved?.state){this.state={...this.state,...saved.state,session:uid('SESSION')};this.trace=Array.isArray(saved.trace)?saved.trace.slice(-120):[];}
    }catch(err){console.warn('JM restore held',err)}
  }
  persist(){
    try{localStorage.setItem(STORE,JSON.stringify({state:this.state,trace:this.trace.slice(-120)}));}catch(err){console.warn('JM persist held',err)}
  }
  route(next,source='route-rail'){
    if(!this.routes.includes(next))return false;
    const from=this.state.route;this.state.route=next;
    this.contact('ROUTE_CHANGE',{from,to:next,source});
    return true;
  }
  contact(type,detail={},persist=true){
    const event={id:uid('TRACE'),at:now(),type,route:this.state.route,detail:clone(detail)};
    this.trace.unshift(event);this.trace=this.trace.slice(0,160);
    this.state.contacts=(this.state.contacts||0)+1;this.state.lastContact=event;
    if(persist)this.persist();
    window.dispatchEvent(new CustomEvent('jm:trace',{detail:event}));
    return event;
  }
  set(key,value,type='STATE_CHANGE'){
    const before=this.state[key];this.state[key]=value;this.contact(type,{key,before,value});return value;
  }
  addStoryFrame(frame){
    const item={id:uid('FRAME'),at:now(),caption:'',...frame};
    this.state.story=[...(this.state.story||[]),item].slice(-24);
    this.contact('STORY_FRAME_ADDED',{id:item.id,kind:item.kind||'unknown',source:item.source||this.state.route});
    return item;
  }
  updateStory(id,patch){
    this.state.story=(this.state.story||[]).map(x=>x.id===id?{...x,...patch}:x);this.persist();
  }
  removeStory(id){
    this.state.story=(this.state.story||[]).filter(x=>x.id!==id);this.contact('STORY_FRAME_REMOVED',{id});
  }
  clear(){
    this.trace=[];this.state.contacts=0;this.state.lastContact=null;this.persist();
    window.dispatchEvent(new CustomEvent('jm:trace-cleared'));
  }
  ding(scope='SESSION'){
    const receipt={schema:'jm.ding.receipt/0.1',id:uid('DING'),created_at:now(),scope,body:this.identity,source_seed:this.state.seed?.name||'visual-lab.cading',route:this.state.route,contacts:this.state.contacts,trace_count:this.trace.length,story_frames:(this.state.story||[]).length,laws:this.laws,status:this.trace.length?'WORKING_DING_EARNED':'NO_DING',claim_boundary:'Working interaction receipt only; not a crown, production APK, or universal perceptual claim.',recent_trace:this.trace.slice(0,12)};
    this.contact('DING_RECEIPT',{id:receipt.id,status:receipt.status,scope});
    return receipt;
  }
  exportBody(){return {schema:'jm.onebody/0.1',identity:this.identity,laws:this.laws,state:this.state,trace:this.trace,exported_at:now()}}
}

function parseCading(source=''){
  const body={name:'Visual Systems Lab Seed',version:'0.1',routes:[],fields:[],laws:[],raw:source,status:'OPEN'};
  String(source).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).forEach(line=>{
    const full=line.endsWith('.✓');const clean=line.replace(/\.✓$/,'').trim();
    const [left,...rest]=clean.split('=');const value=rest.join('=').trim();
    if(/^BODY\s/i.test(left)){body.name=value||left.replace(/^BODY\s+/i,'').trim()}
    else if(/^VERSION\s/i.test(left)){body.version=value||left.replace(/^VERSION\s+/i,'').trim()}
    else if(/^ROUTE\s/i.test(left)){body.routes.push({source:left.replace(/^ROUTE\s+/i,'').trim(),landing:value,full})}
    else if(/^FIELD\s/i.test(left)){body.fields.push({source:left.replace(/^FIELD\s+/i,'').trim(),landing:value,full})}
    else if(/^LAW\s/i.test(left)){body.laws.push({source:left.replace(/^LAW\s+/i,'').trim(),landing:value,full})}
  });
  body.status=body.routes.length&&body.routes.every(x=>x.full)?'FULLSTOPPED_FOR_STAGE':'FOOLSTOPPED_OR_OPEN';
  return body;
}

function download(name,data,type='application/json'){
  const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}

window.JMCore={JMOneBody,parseCading,download,uid,now};
})();
