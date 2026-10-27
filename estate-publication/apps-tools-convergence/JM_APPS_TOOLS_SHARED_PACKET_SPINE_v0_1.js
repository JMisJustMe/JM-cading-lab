/* JM APPS & TOOLS SHARED PACKET SPINE v0.1
 * Capability convergence above the 21 strengthened donors.
 * THREADWELL donor law: the user carries continuity; the device contributes capability; the interface contributes form.
 * PRESERVE THE PARTS. ADVANCE THE WHOLE.
 */
(()=>{
  const BUS_KEY='jm.apps.tools.shared.bus.v1';
  const MAX=250;
  const safeParse=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}};
  // CP01 forward repair: missing/corrupt/foreign saved data must always yield an array.
  // The frozen v0.1 FLAZ source remains recoverable at its pinned ancestor commit.
  const read=()=>{const rows=safeParse(localStorage.getItem(BUS_KEY),[]);return Array.isArray(rows)?rows:[]};
  const write=(rows)=>localStorage.setItem(BUS_KEY,JSON.stringify(rows.slice(0,MAX)));
  const uid=(p='JMP')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const now=()=>new Date().toISOString();
  const packet=(kind,source,payload={},meta={})=>({schema:'jm.packet/1.0',id:uid(),created_at:now(),kind,source,payload,meta});
  const send=(p)=>{const rows=read();rows.unshift(p);write(rows);window.dispatchEvent(new CustomEvent('jm:packet',{detail:p}));return p};
  const emit=(kind,source,payload,meta)=>send(packet(kind,source,payload,meta));
  const clear=()=>{localStorage.removeItem(BUS_KEY);window.dispatchEvent(new Event('jm:bus-cleared'))};
  const exportBus=()=>({schema:'jm.apps.tools.bus/1.0',exported_at:now(),packets:read()});
  // CP02: preserve the jm.packet/1.0 format and older packets with optional fields.
  // Reject obviously unusable records before they can break room rendering.
  const isRecord=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const packetRows=(obj)=>{
    const rows=Array.isArray(obj)?obj:(isRecord(obj)&&Array.isArray(obj.packets)?obj.packets:[]);
    return rows.filter(x=>isRecord(x)&&x.schema==='jm.packet/1.0'
      &&(x.source==null||typeof x.source==='string')
      &&(x.meta==null||isRecord(x.meta)));
  };
  const importBus=(obj)=>{
    const valid=packetRows(obj);
    write(valid);
    window.dispatchEvent(new Event('jm:bus-imported'));
    return Math.min(valid.length,MAX);
  };
  const download=(name,data)=>{const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)};
  const stateKey=(env)=>`jm.apps.tools.env.${env}.v1`;
  const loadState=(env,fallback={})=>safeParse(localStorage.getItem(stateKey(env)),fallback)||fallback;
  const saveState=(env,state)=>{localStorage.setItem(stateKey(env),JSON.stringify(state));return state};
  const exportEnvironment=(env)=>({schema:'jm.apps.tools.portable-environment/1.0',environment:env,exported_at:now(),state:loadState(env,{}),packets:read()});
  // Inspect before changing either key. Preview never mutates the browser's saved work.
  const previewEnvironment=(env,obj)=>{
    if(!isRecord(obj)||obj.schema!=='jm.apps.tools.portable-environment/1.0') throw new Error('Portable environment packet required');
    if(obj.environment&&obj.environment!==env) throw new Error(`Packet belongs to ${obj.environment}`);
    if(obj.state!=null&&!isRecord(obj.state)) throw new Error('Environment state must be an object');
    const state=obj.state??{};
    if(state.rooms!=null&&!isRecord(state.rooms)) throw new Error('Environment rooms must be an object');
    if(state.active!=null&&typeof state.active!=='string') throw new Error('Active room must be a string');
    if(obj.packets!=null&&!Array.isArray(obj.packets)) throw new Error('Environment packets must be an array');
    const incoming=obj.packets??[];
    const packets=packetRows(incoming).slice(0,MAX);
    return {state,packets,accepted:packets.length,rejected:incoming.length-packetRows(incoming).length,truncated:Math.max(0,packetRows(incoming).length-MAX)};
  };
  const restoreRaw=(key,raw)=>raw===null?localStorage.removeItem(key):localStorage.setItem(key,raw);
  const importEnvironment=(env,obj)=>{
    const plan=previewEnvironment(env,obj); // all shape checks precede writes
    const stateName=stateKey(env);
    const previousState=localStorage.getItem(stateName),previousBus=localStorage.getItem(BUS_KEY);
    try{
      // Do not announce bus import until BOTH saved bodies are durable.
      write(plan.packets);
      saveState(env,plan.state);
    }catch(err){
      const failed=[];
      for(const [key,old] of [[BUS_KEY,previousBus],[stateName,previousState]]){
        try{restoreRaw(key,old)}catch(recoveryError){failed.push(key)}
      }
      if(failed.length)throw new Error('Import failed; recovery INCOMPLETE for '+failed.join(', '),{cause:err});
      throw new Error('Import failed; prior saved work restored',{cause:err});
    }
    window.dispatchEvent(new Event('jm:bus-imported'));
    return {state:loadState(env,{}),packets:plan.accepted,rejected:plan.rejected,truncated:plan.truncated};
  };
  const readFile=async(file)=>JSON.parse(await file.text());
  const receipt=(source,action,status='ok',details={})=>emit('estate.receipt',source,{action,status,details},{class:'quiet-trace'});
  window.JMAppsToolsSpine={BUS_KEY,read,send,packet,emit,clear,exportBus,importBus,download,loadState,saveState,exportEnvironment,previewEnvironment,importEnvironment,readFile,receipt,uid,now};
})();