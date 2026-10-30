import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS} from '../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {VISUAL_GRAFT_SOURCE,VISUAL_RUNTIME_SOURCE,GLYPHFORGE_SOURCE,GLYPHPLAY_SOURCE} from '../coding-estate/sovereign-batch-six/direct/native-corpus.mjs';
import {NATIVE_CONNECTED_WORLD_EXAMPLE} from '../navigator/estate-integration/execution-lanes.mjs';
const child=spawn(process.execPath,['coding-estate/integration/jm-engine-federation-mcp-stdio.mjs'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe']});
let next=1,buffer='',rejectStartup;
const pending=new Map();
child.stderr.on('data',d=>{buffer+=d.toString()});
child.on('exit',code=>{for(const v of pending.values())v.reject(Error('MCP_HOST_EXIT_'+code+' '+buffer));pending.clear()});
createInterface({input:child.stdout}).on('line',line=>{
 try{const msg=JSON.parse(line),wait=pending.get(msg.id);if(wait){pending.delete(msg.id);msg.error?wait.reject(Error(msg.error.message)):wait.resolve(msg.result)}}catch(e){buffer+='RESPONSE_PARSE_HOLD:'+e.message}
});
function rpc(method,params){
 const id=next++;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP_TIMEOUT_'+method+' '+buffer))},20000);
  pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
 });
}
const tool=async(name,args={})=>{
 const r=await rpc('tools/call',{name,arguments:args});
 return {error:r.isError,data:JSON.parse(r.content[0].text)};
};
try{
 const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM Native Proof',version:'1'}});
 assert.equal(init.serverInfo.name,'JM ECOSTATE Build Mesh / native game-engine host adapter');
 assert.equal((await rpc('tools/list',{})).tools.length,5);
 assert.deepEqual(await rpc('ping',{}),{});
 const i=await tool('jm_engine_inventory');
 assert.equal(i.error,false);
 assert.match(i.data.donors.find(x=>x.name==='Gardles').contact,/HOLD_NATIVE/);
 const p=await tool('jm_engine_plan',{goal:'game visual renderer touch proof'});
 assert.equal(p.error,false);
 assert.equal(p.data.current64.total,64);
 assert.equal(p.data.current64.active.length+p.data.current64.availableCount,64);
 const game=await tool('jm_engine_core_contact',{gameSource:GAME_CODING_SOURCE,coreSource:JM_GAMECORE_SOURCE,
  initialState:{...INITIAL_FACTS,door:{...INITIAL_FACTS.door,authorized:true}}});
 assert.equal(game.error,false);assert.equal(game.data.game.state.door.state,'open');
 const visual=await tool('jm_engine_visual_contact',{
 gameSource:GAME_CODING_SOURCE,coreSource:JM_GAMECORE_SOURCE,
 visualGraftSource:VISUAL_GRAFT_SOURCE,interactionSource:VISUAL_RUNTIME_SOURCE,
 glyphForgeSource:GLYPHFORGE_SOURCE,glyphPlaySource:GLYPHPLAY_SOURCE,
 game:{name:'DoorGame',identity:'DoorGame.v1',capabilities:['tap','drag','save']},
 glyph:'OPEN',input:{type:'tap',value:'opened'},
 initialState:{...INITIAL_FACTS,door:{...INITIAL_FACTS.door,authorized:true}}
 });
 assert.equal(visual.error,false);assert.equal(visual.data.visualGraft.state.expression,'door:open');
 assert.equal(visual.data.visualInput.after.door.input,'opened');
 const source=NATIVE_CONNECTED_WORLD_EXAMPLE;
 const world=await tool('jm_engine_world_contact',{source:{identity:'JM original native world',content:source,sha256:createHash('sha256').update(source).digest('hex')}});
 assert.equal(world.error,false);assert.equal(world.data.spatial.playerConsequence.kind,'collect');
 const missing=await rpc('tools/call',{name:'jm_engine_gardles',arguments:{}});
 assert.equal(missing.isError,true);assert.match(missing.content[0].text,/UNKNOWN_TOOL_HOLD/);
 await assert.rejects(()=>rpc('no-such-method',{}),/METHOD_NOT_FOUND/);
 console.log(JSON.stringify({pass:true,mcpInitialize:true,mcpToolList:5,mcpCoreExecution:true,mcpGameForgeWorld:true,mcpVisualRuntime:true,
  current64Selection:true,gardlesHold:true,scope:'LOCAL_STDIO_HOST_NOT_DEPLOYED'}));
}finally{child.stdin.end();child.kill();}
