/* JM APPS & TOOLS SHARED PACKET SPINE v0.1
 * Capability convergence above the 21 strengthened donors.
 * THREADWELL donor law: the user carries continuity; the device contributes capability; the interface contributes form.
 * PRESERVE THE PARTS. ADVANCE THE WHOLE.
 */
(()=>{
  const BUS_KEY='jm.apps.tools.shared.bus.v1';
  const MAX=250;
  // CP11: unreadable stored source must not silently turn into an empty bus/state.
  // Preserve existing v0.1 keys and public function contracts.
  const stateKey=(env)=>{
    if(!/^[a-z0-9-]{1,80}$/.test(env))throw new Error('ENVIRONMENT_ID_HOLD');
    return 'jm.apps.tools.env.'+env+'.v1';
  };
  const parseSaved=(raw,label,defaultValue)=>{
    if(raw===null)return defaultValue;
    try{return JSON.parse(raw)}catch{throw new Error(label+'_UNREADABLE_HOLD')}
  };
  const assertState=(state)=>{
    if(!state||typeof state!=='object'||Array.isArray(state)||
       !state.rooms||typeof state.rooms!=='object'||Array.isArray(state.rooms)||
       (state.active!==null&&typeof state.active!=='string'))
      throw new Error('ENVIRONMENT_STATE_INVALID_HOLD');
    return state;
  };
  const validatePackets=(rows)=>{
    if(!Array.isArray(rows))throw new Error('PACKET_BUS_FORMAT_HOLD');
    if(rows.length>MAX)throw new Error('PACKET_BUS_FULL_EXPORT_BEFORE_IMPORT');
    const ids=new Set();
    for(const x of rows){
      if(!x||x.schema!=='jm.packet/1.0'||typeof x.id!=='string'||!x.id||
         typeof x.kind!=='string'||typeof x.source!=='string'||typeof x.created_at!=='string'||
         !x.meta||typeof x.meta!=='object'||Array.isArray(x.meta)||
         ids.has(x.id))throw new Error('PACKET_INVALID_OR_DUPLICATE_HOLD');
      ids.add(x.id);
    }
    return rows;
  };
  const read=()=>validatePackets(parseSaved(localStorage.getItem(BUS_KEY),'PACKET_BUS',[]));
  const write=(rows)=>{validatePackets(rows);localStorage.setItem(BUS_KEY,JSON.stringify(rows));return rows};
  const uid=(p='JMP')=>p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const now=()=>new Date().toISOString();
  const packet=(kind,source,payload={},meta={})=>({schema:'jm.packet/1.0',id:uid(),created_at:now(),kind,source,payload,meta});
  const send=(p)=>{
    const rows=read();
    if(rows.length>=MAX)throw new Error('PACKET_BUS_FULL_EXPORT_BEFORE_NEW_WRITE');
    rows.unshift(p);write(rows);
    window.dispatchEvent(new CustomEvent('jm:packet',{detail:p}));
    return p;
  };
  const emit=(kind,source,payload,meta)=>send(packet(kind,source,payload,meta));
  const clear=()=>{localStorage.removeItem(BUS_KEY);window.dispatchEvent(new Event('jm:bus-cleared'))};
  const exportBus=()=>({schema:'jm.apps.tools.bus/1.0',exported_at:now(),packets:read()});
  const importBus=(obj)=>{
    if(!Array.isArray(obj)&&obj?.schema!=='jm.apps.tools.bus/1.0')throw new Error('PACKET_BUS_SCHEMA_HOLD');
    const rows=Array.isArray(obj)?obj:obj.packets;
    validatePackets(rows);write(rows);
    window.dispatchEvent(new Event('jm:bus-imported'));
    return rows.length;
  };
  const download=(name,data)=>{
    const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  };
  const loadState=(env,fallback={})=>{
    const raw=localStorage.getItem(stateKey(env));
    if(raw===null)return fallback;
    return assertState(parseSaved(raw,'ENVIRONMENT_STATE',fallback));
  };
  const saveState=(env,state)=>{assertState(state);localStorage.setItem(stateKey(env),JSON.stringify(state));if(JSON.stringify(loadState(env))!==JSON.stringify(state))throw new Error('ENVIRONMENT_SAVE_READBACK_HOLD');return state};
  const exportEnvironment=(env)=>({
    schema:'jm.apps.tools.portable-environment/1.0',
    environment:env,exported_at:now(),state:loadState(env,{rooms:{},active:null}),packets:read()
  });
  // Browser localStorage has per-key atomicity, not an across-keys transaction.
  // Validate before writing, read back, and restore old values on failure.
  const importEnvironment=(env,obj)=>{
    if(!obj||obj.schema!=='jm.apps.tools.portable-environment/1.0'||obj.environment!==env)
      throw new Error('ENVIRONMENT_ID_OR_SCHEMA_HOLD');
    const nextState=assertState(obj.state);
    const incoming=validatePackets(obj.packets);
    const originalBus=read();
    const incomingIds=new Set(incoming.map(x=>x.id));
    const merged=[...incoming,...originalBus.filter(x=>!incomingIds.has(x.id))];
    validatePackets(merged);
    const sk=stateKey(env);
    const beforeState=localStorage.getItem(sk),beforeBus=localStorage.getItem(BUS_KEY);
    let written=false,busWritten=false;
    try{
      localStorage.setItem(sk,JSON.stringify(nextState));written=true;
      localStorage.setItem(BUS_KEY,JSON.stringify(merged));busWritten=true;
      const afterState=loadState(env,{rooms:{},active:null}),afterBus=read();
      if(JSON.stringify(afterState)!==JSON.stringify(nextState)||
         JSON.stringify(afterBus)!==JSON.stringify(merged))
        throw new Error('ENVIRONMENT_IMPORT_READBACK_HOLD');
    }catch(error){
      if(written){
        try{
          if(beforeState===null)localStorage.removeItem(sk);else localStorage.setItem(sk,beforeState);
          if(busWritten){if(beforeBus===null)localStorage.removeItem(BUS_KEY);else localStorage.setItem(BUS_KEY,beforeBus);}
        }catch(rollbackError){
          throw new Error('ENVIRONMENT_IMPORT_ROLLBACK_HOLD: '+rollbackError.message);
        }
      }
      throw error;
    }
    window.dispatchEvent(new Event('jm:bus-imported'));
    return {state:loadState(env,{rooms:{},active:null}),packets:incoming.length,mergedPackets:merged.length};
  };
  const readFile=async(file)=>JSON.parse(await file.text());
  const receipt=(source,action,status='ok',details={})=>emit('estate.receipt',source,{action,status,details},{class:'quiet-trace'});
  window.JMAppsToolsSpine={BUS_KEY,read,send,packet,emit,clear,exportBus,importBus,download,loadState,saveState,exportEnvironment,importEnvironment,readFile,receipt,uid,now};
})();