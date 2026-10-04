import fs from 'node:fs';
import crypto from 'node:crypto';
import process from 'node:process';
import {
  newState, applyCommand, canonical,
  makeReloadChallenge, verifyReloadChallenge, attachReceipt, publicSnapshot
} from './runtime-core.mjs';

const mode=process.argv[2];
const statePath=process.argv[3];
if(!mode || !statePath) throw new Error('usage: node proof-node.mjs <arm|return> <state-file>');

function sha(text){
  return crypto.createHash('sha256').update(text).digest('hex');
}

if(mode==='arm'){
  let state=newState(Date.now());
  state=applyCommand(state,{type:'OBSERVE',key:'factory-contact',value:'runtime core executed',confidence:1});
  state=applyCommand(state,{type:'CONSEQUENCE',label:'state changed under executable host'});
  state=applyCommand(state,{type:'ARM_SETTLE'});
  for(let i=0;i<12;i++) state=applyCommand(state,{type:'TICK_SETTLE'},Date.now()+i+1);
  if(state.durability.status!=='SETTLED') throw new Error('node settle did not complete');

  const token='JM-NODE-'+crypto.randomBytes(8).toString('hex');
  const loadId='node-process-'+process.pid;
  const priorProbe='prior-node-value';
  const challenge=makeReloadChallenge(state,{token,loadId,priorProbe,now:Date.now()});
  const body={
    schema:'JM.AGILab.NodeProcessWitness/1',
    state:publicSnapshot(state),
    challenge,
    probe:challenge.expectedProbe,
    armedPid:process.pid,
    canonicalStateSha256:sha(canonical(state))
  };
  fs.writeFileSync(statePath,JSON.stringify(body,null,2)+'\n');
  console.log(JSON.stringify({state:'ARMED',pid:process.pid,revision:state.revision,heartbeat:state.durability.heartbeat,sha256:body.canonicalStateSha256}));
  process.exit(0);
}

if(mode==='return'){
  const body=JSON.parse(fs.readFileSync(statePath,'utf8'));
  if(body.schema!=='JM.AGILab.NodeProcessWitness/1') throw new Error('witness schema mismatch');
  if(process.pid===body.armedPid) throw new Error('same process unexpectedly reused');
  const actualSha=sha(canonical(body.state));
  if(actualSha!==body.canonicalStateSha256) throw new Error('state digest mismatch');

  const receipt=verifyReloadChallenge(body.state,body.challenge,{
    loadId:'node-process-'+process.pid,
    probeValue:body.probe,
    now:Date.now()
  });
  if(receipt.state!=='PASS') throw new Error('re-entry HOLD: '+JSON.stringify(receipt.checks));
  let returned=attachReceipt(body.state,receipt);
  const out={
    schema:'JM.AGILab.NodeProcessProof/1',
    state:'PASS',
    armedPid:body.armedPid,
    returnedPid:process.pid,
    distinctProcess:body.armedPid!==process.pid,
    stateSha256:actualSha,
    restoredProbe:body.challenge.priorProbe,
    receipt,
    returnedState:publicSnapshot(returned),
    boundary:'Two separate Node processes proved shared-core state persistence/read-back. This is not browser, OS-reboot, owner-device or AGI proof.'
  };
  fs.writeFileSync(statePath+'.receipt.json',JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
  process.exit(0);
}

throw new Error('unknown mode: '+mode);
