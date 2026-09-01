import {clone,hash,ENGINE_PROFILES} from './shared.mjs';

function seeded(seed){
  let x=(seed>>>0)||1;
  return ()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296);
}

export class NativeCore{
  constructor(profile='glyphplay',seed=32){
    this.profile=ENGINE_PROFILES[profile];
    if(!this.profile) throw Error('NativeCore profile missing');
    this.random=seeded(seed);
    this.state={
      schema:'jm.native-state/0.2',
      profile,
      identityHash:hash([profile,this.profile.law]),
      tick:0,
      status:'READY',
      player:{x:1,y:4,hp:3},
      goal:{x:8,y:1},
      score:0,
      entities:[]
    };
    for(let i=0;i<6;i++){
      this.state.entities.push({
        id:'e'+i,
        x:2+Math.floor(this.random()*6),
        y:1+Math.floor(this.random()*4),
        kind:i%3===0?'hazard':'node',
        hit:false
      });
    }
    this.checkpoint=clone(this.state);
    this.trace=[];
  }

  step(input={verb:'IDLE',dx:0,dy:0}){
    if(this.state.status==='FAULT') return {ok:false,held:true,state:clone(this.state)};
    this.state.tick++;
    if(input.verb!=='IDLE'&&!this.profile.verbs.includes(input.verb)){
      this.state.status='FAULT';
      this.trace.push({type:'FAULT',tick:this.state.tick,message:'PermissionGate rejected profile-invalid verb',verb:input.verb});
      return {ok:false,state:clone(this.state)};
    }
    if(['MOVE','STEP','PULL'].includes(input.verb)){
      const nx=this.state.player.x+(input.dx||0);
      const ny=this.state.player.y+(input.dy||0);
      if(nx<0||ny<0||nx>9||ny>5){
        this.trace.push({type:'FAULT',tick:this.state.tick,message:'CollisionBoundary held movement'});
      }else{
        this.state.player.x=nx;
        this.state.player.y=ny;
      }
    }
    if(input.verb!=='IDLE') this.state.score++;
    for(const entity of this.state.entities){
      if(!entity.hit&&entity.x===this.state.player.x&&entity.y===this.state.player.y){
        entity.hit=true;
        entity.kind==='hazard'?this.state.player.hp--:this.state.score++;
      }
    }
    if(this.state.player.x===this.state.goal.x&&this.state.player.y===this.state.goal.y) this.state.status='WIN';
    this.trace.push({type:'BUILD',tick:this.state.tick,message:'Fixed-step consequence applied',verb:input.verb});
    return {ok:true,state:clone(this.state),stateHash:hash(this.state)};
  }

  save(){
    this.checkpoint=clone(this.state);
    return hash(this.checkpoint);
  }

  fault(reason='deliberate invalid action'){
    this.state.status='FAULT';
    this.trace.push({type:'FAULT',tick:this.state.tick,message:'FaultHold entered',reason});
  }

  recover(){
    this.state=clone(this.checkpoint);
    this.state.status='READY';
    this.trace.push({type:'PASS',tick:this.state.tick,message:'RecoveryBody restored fixed-step checkpoint'});
    return clone(this.state);
  }

  targets(){
    return {
      schema:'jm.native-targets/0.2',
      profile:this.profile.id,
      identityHash:this.state.identityHash,
      targets:['cpp17','rust2024','wasm32'],
      abi:['init','step','snapshot','recover','receipt'],
      status:'TARGET_CONTRACTS_EMITTED_NOT_NATIVE_BINARIES'
    };
  }

  receipt(){
    return {
      schema:'jm.nativecore-receipt/0.2',
      profile:this.profile.id,
      identityHash:this.state.identityHash,
      stateHash:hash(this.state),
      traceHash:hash(this.trace),
      tick:this.state.tick,
      status:this.state.status
    };
  }
}
