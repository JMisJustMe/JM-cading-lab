import{createDelegation}from'./models.mjs';
import{clone,key,scopeContains}from'./util.mjs';
export function verifyDelegation(engine,id,actor,scope,rank,at=new Date().toISOString(),seen=new Set()){
  const d=engine.delegations.get(id);if(!d)return{valid:false,reason:'Delegation not found.',chain:[]};
  if(seen.has(id))return{valid:false,reason:'Delegation cycle detected.',chain:[id]};seen.add(id);
  if(key(d.grantee)!==key(actor))return{valid:false,reason:'Actor is not the delegation grantee.',chain:[id]};
  if(!scopeContains(d.scope,scope))return{valid:false,reason:'Requested scope exceeds delegation.',chain:[id]};
  if(Number(rank)>d.maxAuthorityRank)return{valid:false,reason:'Requested authority exceeds delegation.',chain:[id]};
  if(d.expiresAt&&new Date(at)>=new Date(d.expiresAt))return{valid:false,reason:'Delegation expired.',chain:[id]};
  if(!d.parentDelegationId)return d.sourceVerified?{valid:true,reason:'Verified root delegation.',chain:[id]}:{valid:false,reason:'Root delegation is unverified.',chain:[id]};
  const parent=engine.delegations.get(d.parentDelegationId);
  if(!parent?.allowRedelegation)return{valid:false,reason:'Parent forbids redelegation.',chain:[id,d.parentDelegationId]};
  const upstream=verifyDelegation(engine,parent.id,d.grantor,d.scope,d.maxAuthorityRank,at,seen);
  return upstream.valid?{valid:true,reason:'Delegation chain verified.',chain:[...upstream.chain,id]}:{...upstream,chain:[...upstream.chain,id]};
}
export function grantDelegation(engine,input){
  const d=createDelegation(input);
  if(d.parentDelegationId){
    const parent=engine.delegations.get(d.parentDelegationId);
    const check=parent&&verifyDelegation(engine,parent.id,d.grantor,d.scope,d.maxAuthorityRank,d.createdAt);
    if(!check?.valid||!parent.allowRedelegation||!scopeContains(parent.scope,d.scope)||d.maxAuthorityRank>parent.maxAuthorityRank){
      engine.record('DELEGATION_REJECTED',{delegation:clone(d),decision:'REJECT',reason:check?.reason||'Child exceeds parent bounds.'});
      return{valid:false,delegation:d,reason:check?.reason||'Child exceeds parent bounds.'};
    }
  }else if(!d.sourceVerified){
    engine.record('DELEGATION_REJECTED',{delegation:clone(d),decision:'REJECT',reason:'Root delegation requires verified source.'});
    return{valid:false,delegation:d,reason:'Root delegation requires verified source.'};
  }
  engine.delegations.set(d.id,d);engine.record('DELEGATION_GRANTED',{delegation:clone(d),decision:'GRANT',reason:'Delegation passed scope and rank gates.'});
  return{valid:true,delegation:clone(d)};
}
