// JM operated-host CP02: supervised existing Node bodies, no shell or public control API.
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const insist=(yes,msg)=>{if(!yes)throw Error(msg)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class JMNodeSupervisor{
 constructor({entry,cwd=path.dirname(path.resolve(entry)),port,healthPath='/ready',maxRestarts=2,intervalMs=120,timeoutMs=4500,env={},readinessProof=false}){
  this.entry=path.resolve(entry);this.cwd=path.resolve(cwd);this.port=port;
  insist(Number.isInteger(port)&&port>0&&port<65536,'INVALID_SERVICE_PORT');
  insist(this.entry.startsWith(this.cwd+path.sep),'ENTRY_OUTSIDE_CWD');
  insist(fs.lstatSync(this.entry).isFile()&&!fs.lstatSync(this.entry).isSymbolicLink(),'UNSAFE_ENTRY_FILE');
  insist(/^\/[a-z0-9/_-]{1,120}$/.test(healthPath),'INVALID_HEALTH_PATH');
  insist(Number.isInteger(maxRestarts)&&maxRestarts>=0&&maxRestarts<=10,'INVALID_RESTART_LIMIT');
  insist(Number.isInteger(intervalMs)&&intervalMs>=25&&intervalMs<=10000,'INVALID_PROBE_INTERVAL');
  insist(Number.isInteger(timeoutMs)&&timeoutMs>=100&&timeoutMs<=120000,'INVALID_PROBE_TIMEOUT');
  insist(typeof readinessProof==='boolean','INVALID_READINESS_PROOF_MODE');
  insist(fs.realpathSync(this.entry)===this.entry&&fs.realpathSync(this.cwd)===this.cwd,'UNSAFE_ENTRY_PATH');
  this.readinessProof=readinessProof;this._proofToken=null;
  this.started=false;this.healthPath=healthPath;this.maxRestarts=maxRestarts;this.intervalMs=intervalMs;this.timeoutMs=timeoutMs;this.env={...env};
  this.child=null;this.stopping=false;this.restartCount=0;this.lastExit=null;this.lastError=null;this.restartTimer=null;
 }
 _spawn(){
  if(this.stopping)return;
  // Optional cooperative challenge: rotate per spawn, including crash restarts.
  this._proofToken=this.readinessProof?randomBytes(24).toString('hex'):null;
  const childEnv={...process.env,...this.env,HOST:'127.0.0.1',PORT:String(this.port)};
  if(this.readinessProof)childEnv.JM_SUPERVISOR_PROOF=this._proofToken;
  const child=spawn(process.execPath,[this.entry],{cwd:this.cwd,env:childEnv,shell:false,stdio:'ignore',windowsHide:true});
  this.child=child;
  child.once('error',err=>{this.lastError=err.code||'SPAWN_ERROR'});
  child.once('close',(code,signal)=>{
   if(this.child!==child)return;
   this.child=null;this._proofToken=null;this.lastExit={code,signal};
   if(this.stopping||this.restartCount>=this.maxRestarts)return;
   this.restartCount++;
   this.restartTimer=setTimeout(()=>{this.restartTimer=null;this._spawn()},Math.max(60,this.intervalMs));
  });
 }
 async probe(){
  const child=this.child;if(!child||this.stopping)return false;
  try{
   const response=await fetch('http://127.0.0.1:'+this.port+this.healthPath,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(600)});
   if(response.status!==200||!response.headers.get('content-type')?.includes('json'))return false;
   const reader=response.body?.getReader();if(!reader)return false;
   let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return false}chunks.push(Buffer.from(value))}}finally{reader.releaseLock()}
   const info=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const proven=!this.readinessProof||(typeof info?.supervisorProof==='string'&&info.supervisorProof===this._proofToken&&this._proofToken!==null);
   return this.child===child&&!this.stopping&&proven&&info?.ok===true&&(info.ready===true||info.scope==='JM_NODE_TEST');
  }catch{return false}
 }
 async start(){
  insist(!this.started&&!this.stopping,'ALREADY_STARTED');this.started=true;
  // An occupied port is a pre-spawn failure, not a consumed supervisor instance.
  // Preserve the concurrent-start guard while checking; allow retry only after
  // the failed preflight has fully settled and no child was started.
  try{
   await new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',()=>reject(Error('SERVICE_PORT_OCCUPIED')));socket.listen({host:'127.0.0.1',port:this.port,exclusive:true},()=>socket.close(resolve))});
  }catch(error){if(!this.stopping)this.started=false;throw error}
  insist(!this.stopping,'SUPERVISOR_STOPPED');this._spawn();
  const until=Date.now()+this.timeoutMs;
  while(Date.now()<until){if(await this.probe()&&this.child)return {ok:true,pid:this.child.pid,restarts:this.restartCount};
   if(!this.child&&this.restartCount>=this.maxRestarts&&this.restartTimer===null)break;
   await sleep(this.intervalMs);
  }
  await this.stop();throw Error('SUPERVISED_READINESS_HOLD');
 }
 status(){return {running:!!this.child&&!this.stopping,pid:this.child?.pid||null,restarts:this.restartCount,lastExit:this.lastExit,lastError:this.lastError}}
 async stop(){
  this.stopping=true;if(this.restartTimer)clearTimeout(this.restartTimer);this.restartTimer=null;
  const child=this.child;if(!child){this._proofToken=null;return;}
  await new Promise(resolve=>{
   const timer=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},1000);
   child.once('close',()=>{clearTimeout(timer);resolve()});
   try{child.kill('SIGTERM')}catch{clearTimeout(timer);resolve()}
  });
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [action,entry,rawPort,workingDir]=process.argv.slice(2);
 if(action!=='run')throw Error('USAGE run <existing_entry.mjs> <port> [working_directory]');
 const supervisor=new JMNodeSupervisor({entry,cwd:workingDir||path.dirname(path.resolve(entry)),port:Number(rawPort),timeoutMs:10000});
 supervisor.start().then(result=>console.log(JSON.stringify({...result,scope:'JM_LOCAL_NODE_SUPERVISION',claim:'LOCAL_RUNTIME_ONLY'}))).catch(error=>{console.error(error.message);process.exitCode=1});
 process.on('SIGINT',()=>supervisor.stop().then(()=>process.exit()));
 process.on('SIGTERM',()=>supervisor.stop().then(()=>process.exit()));
}
