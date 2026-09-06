(()=>{
  'use strict';
  const CANON='https://jmisjustme-estate.pages.dev/';
  const REG_PATH='/navigator/estate-integration/public-registry.json';
  const TRACE_KEY='JM_ESTATE_INTEGRATION_TRACE_v1';
  const script=document.currentScript;
  const surface=(script?.dataset?.jmSurface||document.documentElement.dataset.jmSurface||location.pathname||'unknown').toString();

  function now(){return new Date().toISOString();}
  function readTrace(){try{return JSON.parse(localStorage.getItem(TRACE_KEY)||'[]')}catch{return []}}
  function receipt(action,detail={}){
    const row={at:now(),action,surface,detail};
    try{
      const rows=readTrace();
      rows.unshift(row);
      localStorage.setItem(TRACE_KEY,JSON.stringify(rows.slice(0,64)));
    }catch{}
    window.dispatchEvent(new CustomEvent('jm-estate-integration-trace',{detail:row}));
    return row;
  }
  async function loadRegistry(){
    const sameOrigin=new URL(REG_PATH,location.origin).href;
    const canonical=new URL(REG_PATH,CANON).href;
    let last;
    for(const url of [...new Set([sameOrigin,canonical])]){
      try{
        const res=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json'}});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data=await res.json();
        if(data?.schema!=='JM.Estate.PublicNervousSystem/1') throw new Error('schema mismatch');
        if(data?.canonical_root!==CANON) throw new Error('canonical-root mismatch');
        receipt('registry.load.pass',{url,version:data.version,status:data.status});
        return {data,url};
      }catch(err){last=err;receipt('registry.load.hold',{url,error:String(err?.message||err)})}
    }
    throw last||new Error('registry unavailable');
  }
  function routeIndex(registry){
    const rows=[...(registry.routes||[]),...(registry.services||[])];
    return new Map(rows.map(r=>[String(r.id).toLowerCase(),r]));
  }
  function installDoor(registry){
    if(document.getElementById('jm-estate-integration-door')) return;
    const nav=document.getElementById('quickDoors');
    const href=registry.integration_route||new URL('/navigator/estate-integration/',CANON).href;
    if(nav){
      const a=document.createElement('a');
      a.id='jm-estate-integration-door';
      a.className='door';
      a.href=href;
      a.innerHTML='<span><strong>Estate Integration</strong><small>Shared routes · authority boundaries · live bridge state</small></span><b>↗</b>';
      nav.appendChild(a);
      return;
    }
    const a=document.createElement('a');
    a.id='jm-estate-integration-door';
    a.href=href;
    a.textContent='Estate ↗';
    a.setAttribute('aria-label','Open JM Estate integration');
    Object.assign(a.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:'2147483000',padding:'9px 12px',borderRadius:'999px',background:'rgba(8,11,16,.92)',border:'1px solid rgba(255,255,255,.22)',color:'#fff',font:'700 12px system-ui,sans-serif',textDecoration:'none',boxShadow:'0 8px 28px rgba(0,0,0,.32)'});
    document.body.appendChild(a);
  }
  function expose(registry,sourceUrl){
    const index=routeIndex(registry);
    const api={
      schema:'JM.Estate.PublicBridge/1',
      registry,
      registryUrl:sourceUrl,
      surface,
      resolve(id){return index.get(String(id||'').toLowerCase())||null},
      list(){return [...index.values()]},
      open(id){
        const row=this.resolve(id);
        if(!row?.url){receipt('route.open.hold',{id,reason:'route-not-found'});return false}
        receipt('route.open',{id:row.id,url:row.url,role:row.role});
        location.href=row.url;
        return true;
      },
      trace(){return readTrace()},
      receipt
    };
    Object.freeze(api);
    window.JMEstateIntegration=api;
    window.dispatchEvent(new CustomEvent('jm-estate-integration-ready',{detail:{surface,registry,registryUrl:sourceUrl}}));
    installDoor(registry);
    receipt('bridge.ready',{registryUrl:sourceUrl,routeCount:index.size});
  }
  loadRegistry().then(({data,url})=>expose(data,url)).catch(err=>{
    receipt('bridge.hold',{error:String(err?.message||err)});
    window.dispatchEvent(new CustomEvent('jm-estate-integration-hold',{detail:{surface,error:String(err?.message||err)}}));
  });
})();
