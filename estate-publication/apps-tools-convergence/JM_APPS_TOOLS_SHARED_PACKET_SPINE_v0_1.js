/* JM APPS & TOOLS SHARED PACKET SPINE v0.1
 * Capability convergence above the 21 strengthened donors.
 * THREADWELL donor law: the user carries continuity; the device contributes capability; the interface contributes form.
 * PRESERVE THE PARTS. ADVANCE THE WHOLE.
 */
(()=>{
  const BUS_KEY='jm.apps.tools.shared.bus.v1';
  const MAX=250;
  const safeParse=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}};
  const read=()=>safeParse(localStorage.getItem(BUS_KEY),'[]')||[];
  const write=(rows)=>localStorage.setItem(BUS_KEY,JSON.stringify(rows.slice(0,MAX)));
  const uid=(p='JMP')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const now=()=>new Date().toISOString();
  const packet=(kind,source,payload={},meta={})=>({schema:'jm.packet/1.0',id:uid(),created_at:now(),kind,source,payload,meta});
  const send=(p)=>{const rows=read();rows.unshift(p);write(rows);window.dispatchEvent(new CustomEvent('jm:packet',{detail:p}));return p};
  const emit=(kind,source,payload,meta)=>send(packet(kind,source,payload,meta));
  const clear=()=>{localStorage.removeItem(BUS_KEY);window.dispatchEvent(new Event('jm:bus-cleared'))};
  const exportBus=()=>({schema:'jm.apps.tools.bus/1.0',exported_at:now(),packets:read()});
  const importBus=(obj)=>{
    const rows=Array.isArray(obj)?obj:Array.isArray(obj?.packets)?obj.packets:[];
    const valid=rows.filter(x=>x&&x.schema==='jm.packet/1.0');
    write(valid); window.dispatchEvent(new Event('jm:bus-imported')); return valid.length;
  };
  const download=(name,data)=>{const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)};
  const stateKey=(env)=>`jm.apps.tools.env.${env}.v1`;
  const loadState=(env,fallback={})=>safeParse(localStorage.getItem(stateKey(env)),fallback)||fallback;
  const saveState=(env,state)=>{localStorage.setItem(stateKey(env),JSON.stringify(state));return state};
  const exportEnvironment=(env)=>({schema:'jm.apps.tools.portable-environment/1.0',environment:env,exported_at:now(),state:loadState(env,{}),packets:read()});
  const importEnvironment=(env,obj)=>{
    if(!obj||obj.schema!=='jm.apps.tools.portable-environment/1.0') throw new Error('Portable environment packet required');
    if(obj.environment&&obj.environment!==env) throw new Error(`Packet belongs to ${obj.environment}`);
    saveState(env,obj.state||{});
    const importedPackets=importBus(obj.packets||[]);
    return {state:loadState(env,{}),packets:importedPackets};
  };
  const readFile=async(file)=>JSON.parse(await file.text());
  const receipt=(source,action,status='ok',details={})=>emit('estate.receipt',source,{action,status,details},{class:'quiet-trace'});
  window.JMAppsToolsSpine={BUS_KEY,read,send,packet,emit,clear,exportBus,importBus,download,loadState,saveState,exportEnvironment,importEnvironment,readFile,receipt,uid,now};
})();