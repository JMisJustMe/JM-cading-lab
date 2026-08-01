import {clone,hash} from './shared.mjs';

export class EngineConsole{
  constructor(core){
    this.core=core;
    this.selected=null;
    this.launches=[];
  }

  select(id){
    if(!this.core.registry.has(id)) throw Error('Console cannot select unregistered engine');
    this.selected=id;
    return this.core.identity(id);
  }

  launch(id=this.selected){
    if(!id) throw Error('Console selection required');
    const row={
      engineId:id,
      identityHash:this.core.identity(id),
      launchHash:hash([id,this.core.identity(id),this.launches.length])
    };
    this.launches.push(row);
    return row;
  }

  dispatch(service,payload={}){
    if(!this.selected) throw Error('Console selection required');
    return this.core.request(this.selected,service,payload);
  }

  snapshot(){
    if(!this.selected) throw Error('Console selection required');
    return this.core.checkpoint(this.selected);
  }

  recover(){
    return this.dispatch('RecoveryService');
  }

  export(){
    return {
      schema:'jm.engine-console/0.5',
      selected:this.selected,
      launches:clone(this.launches),
      receipt:this.selected?this.core.receipt(this.selected):null,
      boundary:'operator surface routes through GameCore; it does not own engine internals'
    };
  }
}
