// JM operated-host CP02: supervised existing Node bodies, no shell or public control API.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const insist=(yes,msg)=>{if(!yes)throw Error(msg)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class JMNodeSupervisor{
 constructor({entry,cwd=path.dirname(path.resolve(entry)),port,healthPath='/ready',maxRestarts=2,intervalMs=120,timeoutMs=4500,env={}}){
  this.entry=path.resolve(entry);this.cwd=path.resolve(cwd);this.port=port;
  insist(Number.isInteger(port)&&port>0&&port<65536,'INVALID_SERVICE_PORT');
  insist(this.entry.startsWith(this.cwd+path.sep),'ENTRY_OUTSIDE_CWD');
  insist(fs.lstatSync(this.entry).isFile()&&!fs.lstatSync(this.entry).isSymbolicLink(),'UNSAFE_ENTRY_FILE');
  insist(/^\/[a-z0-9/_-]{1,120}$/.test(healthPath),'INVALID_HEALTH_PATH');
  insist(Number.isInteger(maxRestarts)&&maxRestarts>=0&&maxRestarts<=10,'INVALID_RESTART_LIMIT');
  insist(Number.isInteger(intervalMs)&&intervalMs>=25&&intervalMs<=10000,'INVALID_PROBE_INTERVAL');
  this.healthPath=healthPath;this.maxRestarts=maxRestarts;this.intervalMs=intervalMs;this.timeoutMs=timeoutMs;this.env={...env};
  this.child=null;this.stopping=false;this.restartCount=0;this.lastExit=null;this.lastError=null;this.restartTimer=null;
 }
 _spawn(){
  if(this.stopping)return;
  const child=spawn(process.execPath,[this.entry],{cwd:this.cwd,env:{...process.env,...this.env,HOST:'127.0.0.1',PORT:String(this.port)},shell:false,stdio:'ignore',windowsHide:true});
  this.child=child;
  child.once('error',err=>{this.lastError=err.code||'SPAWN_ERROR'});
  child.once('exit',(code,signal)=>{
   if(this.child!==child)return;
   this.child=null;this.lastExit={code,signal};
   if(this.stopping||this.restartCount>=this.maxRestarts)return;
   this.restartCount++;
   this.restartTimer=setTimeout(()=>{this.restartTimer=null;this._spawn()},Math.max(60,this.intervalMs));
  });
 }
 async probe(){
  if(!this.child)return false;
  try{
   const response=await fetch('http://127.0.0.1:'+this.port+this.healthPath,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(600)});
   if(response.status!==200||!response.headers.get('content-type')?.includes('json'))return false;
   const info=await response.json();return info?.ok===true&&(info.ready===true||info.scope==='JM_NODE_TEST');
  }catch{return false}
 }
 async start(){
  insist(!this.child&&!this.stopping,'ALREADY_STARTED');this._spawn();
  const until=Date.now()+this.timeoutMs;
  while(Date.now()<until){if(await this.probe())return {ok:true,pid:this.child.pid,restarts:this.restartCount};
   if(!this.child&&this.restartCount>=this.maxRestarts&&this.restartTimer===null)break;
   await sleep(this.intervalMs);
  }
  await this.stop();throw Error('SUPERVISED_READINESS_HOLD');
 }
 status(){return {running:!!this.child&&!this.stopping,pid:this.child?.pid||null,restarts:this.restartCount,lastExit:this.lastExit,lastError:this.lastError}}
 async stop(){
  this.stopping=true;if(this.restartTimer)clearTimeout(this.restartTimer);this.restartTimer=null;
  const child=this.child;if(!child)return;
  await new Promise(resolve=>{
   const timer=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},1000);
   child.once('exit',()=>{clearTimeout(timer);resolve()});
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
