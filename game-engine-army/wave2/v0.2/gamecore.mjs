import {clone,hash} from './shared.mjs';

export class GameCore{
  constructor(){
    this.registry=new Map();
    this.vault=new Map();
    this.traces=new Map();
    this.snapshots=new Map();
    this.host=[];
  }

  register(profile){
    if(!profile?.id||!profile?.law) throw Error('BodyRegistry rejected incomplete profile');
    this.registry.set(profile.id,clone(profile));
    if(!this.vault.has(profile.id)) this.vault.set(profile.id,{engineId:profile.id,tick:0,status:'READY',score:0});
    if(!this.traces.has(profile.id)) this.traces.set(profile.id,[]);
    return this.identity(profile.id);
  }

  identity(id){
    const profile=this.registry.get(id);
    if(!profile) throw Error('BodyRegistry missing '+id);
    return hash([profile.id,profile.law,profile.verbs]);
  }

  state(id){
    if(!this.registry.has(id)) throw Error('BodyRegistry missing '+id);
    return clone(this.vault.get(id));
  }

  trace(id,type,message,data={}){
    const row={engineId:id,type,message,data,tick:this.state(id).tick};
    this.traces.get(id).push(row);
    return row;
  }

  checkpoint(id){
    this.snapshots.set(id,this.state(id));
    this.trace(id,'PASS','StateVault checkpoint sealed',{stateHash:hash(this.state(id))});
    return hash(this.snapshots.get(id));
  }

  request(id,service,payload={}){
    if(!this.registry.has(id)) throw Error('ServiceBus rejected unknown engine');
    const state=this.vault.get(id);
    state.tick++;

    if(service==='InputService'){
      if(!this.registry.get(id).verbs.includes(payload.verb)){
        state.status='FAULT';
        this.trace(id,'FAULT','PermissionGate rejected engine-invalid verb',{verb:payload.verb});
        return {ok:false,state:this.state(id)};
      }
      state.lastVerb=payload.verb;
      state.score++;
      this.trace(id,'BUILD','InputService routed engine-owned verb',{verb:payload.verb});
    }else if(service==='StateVault'){
      Object.assign(state,clone(payload.patch||{}));
      this.trace(id,'BUILD','StateVault applied namespaced patch');
    }else if(service==='TraceService'){
      this.trace(id,payload.type||'BUILD',payload.message||'trace');
    }else if(service==='RecoveryService'){
      const snapshot=this.snapshots.get(id);
      if(!snapshot) throw Error('RecoveryService missing engine snapshot');
      this.vault.set(id,clone(snapshot));
      this.vault.get(id).status='READY';
      this.trace(id,'PASS','RecoveryService restored engine-owned checkpoint');
    }else if(service==='HostBridge'){
      const packet={engineId:id,identityHash:this.identity(id),payload:clone(payload)};
      packet.packetHash=hash(packet);
      this.host.push(packet);
      this.trace(id,'PASS','HostBridge emitted identity-bound packet',{packetHash:packet.packetHash});
      return {ok:true,packet};
    }else{
      throw Error('ServiceBus unknown service '+service);
    }
    return {ok:true,state:this.state(id)};
  }

  receipt(id){
    return {
      schema:'jm.gamecore-receipt/0.2',
      engineId:id,
      identityHash:this.identity(id),
      stateHash:hash(this.state(id)),
      traceHash:hash(this.traces.get(id)),
      status:this.state(id).status
    };
  }
}
