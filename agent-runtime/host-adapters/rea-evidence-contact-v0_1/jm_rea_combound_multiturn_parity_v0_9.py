#!/usr/bin/env python3
"""JM × REA: protected COMBOUND long-horizon consequence comparison.

Original and corrected source are user-owned private files: read-only, never
uploaded or embedded in receipt. This tests deterministic simulated game steps,
NOT real wall-clock full-match play, REA analysis or a physical phone.
"""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ORIGINAL='53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428'
CANDIDATE='66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1'
MODES=('CLASSIC','ARCADE')
ARENAS=('BLOOM_RING','TOXIC_GARDEN')
STEPS=2400
SEED="""<script>
Math.random=(function(){let s=1234567;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)})();
requestAnimationFrame=()=>0;
window.__JM_tick=0;
Object.defineProperty(performance,'now',{configurable:true,value:()=>window.__JM_tick});
Date.now=()=>1770000000000;
</script>"""
GAME_JS="""({drag,frames})=>{
 const u=Runtime.active(),pt={x:u.x-drag[0],y:u.y-drag[1]};
 // Browser's visibility/pause state is not human input: unpause explicitly.
 Runtime.state.paused=false;
 Runtime.beginDrag(u,{x:u.x,y:u.y},9);
 Runtime.moveDrag(pt);
 Runtime.releaseDrag(pt);
 const checkpoints=[];
 function snapshot(frame){
  const s=Runtime.state;
  return {frame,phase:s.phase,turn:s.turn,turnNo:s.turnNo,
   ended:s.ended,winner:s.winner,shotSeq:s.shotSeq,
   turnTimer:s.turnTimer,stats:s.stats,aiTimer:s.aiTimer,aiPlan:s.aiPlan,
   crew:s.crewCycle,bursts:s.burstCount,
   shot:s.shot?{actorId:s.shot.actorId,power:s.shot.power,
    vector:s.shot.vector,owner:s.shot.owner,
    chain:s.shot.chain,contacts:s.shot.contacts}:null,
   units:s.units.map(u=>[u.id,u.x,u.y,u.vx,u.vy,u.hp,u.alive,
    u.shield,u.wallSurge,u.familiarity,u.turnsUsed]),
   receipts:Runtime.receipts.map(r=>r.type),
   memory:s.memoryNodes.length,tension:s.tensionFields.length};
 }
 checkpoints.push(snapshot(0));
 for(let frame=1;frame<=frames;frame++){
  window.__JM_tick+=1000/120;
  Runtime.step(1/120);
  if(frame%120===0)checkpoints.push(snapshot(frame));
 }
 return checkpoints;
}"""
def sha(raw):
 return hashlib.sha256(raw).hexdigest()
def check(ok,reason):
 if not ok: raise RuntimeError('JM_COMBOUND_CONSEQUENCE_HOLD:'+reason)
def contact(browser,html,mode,arena):
 ctx=browser.new_context(viewport={'width':430,'height':932},
                         is_mobile=True,has_touch=True,device_scale_factor=1)
 page=ctx.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  check('<head>' in html,'MISSING_DOCUMENT_HEAD')
  page.set_content(html.replace('<head>','<head>'+SEED,1),
    wait_until='domcontentloaded',timeout=30000)
  page.evaluate('(args)=>{save.arena=args.arena;save.matchStyle=args.mode;save.rivalHouse="RANDOM"}',
    {'arena':arena,'mode':mode})
  page.locator('#quickBtn').click(timeout=6000)
  snapshots=page.evaluate(GAME_JS,{'drag':[150,-60],'frames':STEPS})
  return snapshots,errors
 finally:
  ctx.close()
def compare(original,corrected):
 check(len(original)==len(corrected)==21,'CHECKPOINT_COUNT')
 check(original==corrected,'OBSERVABLE_CONSEQUENCE_DIVERGENCE')
 phases={(s['turn'],s['phase']) for s in corrected}
 check(('player','moving') in phases,'PLAYER_SHOT_ABSENT')
 check(('enemy','ai_preview') in phases,'AI_PREVIEW_ABSENT')
 check(('enemy','moving') in phases,'ENEMY_SHOT_ABSENT')
 check(any(s['turn']=='player' and s['turnNo']>=2 for s in corrected),
       'PLAYER_RETURN_TURN_ABSENT')
 # Honest scope: a return to second player turn is not proof of winning a match.
 check(not corrected[-1]['ended'],'COMPLETE_MATCH_NOT_IN_THIS_FIXTURE')
 return {'checkpoints':len(corrected),
         'first_sha256':sha(json.dumps(corrected[0],sort_keys=True).encode()),
         'last_sha256':sha(json.dumps(corrected[-1],sort_keys=True).encode()),
         'ai_preview_observed':True,'enemy_shot_observed':True,
         'return_to_player_observed':True,
         'final_turn':corrected[-1]['turnNo'],
         'final_phase':corrected[-1]['phase'],
         'receipt_count':len(corrected[-1]['receipts']),
         'final_hp':[u[5] for u in corrected[-1]['units']]}
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--original',required=True,type=Path)
 p.add_argument('--candidate',required=True,type=Path)
 p.add_argument('--receipt',required=True,type=Path)
 p.add_argument('--chromium',default='/usr/bin/chromium')
 a=p.parse_args()
 check(a.original.is_file() and a.candidate.is_file(),'SOURCE_FILES_REQUIRED')
 check(a.receipt.is_absolute() and not a.receipt.exists(),'NEW_ABSOLUTE_RECEIPT')
 check(a.original.resolve()!=a.candidate.resolve(),'INDEPENDENT_BODIES_REQUIRED')
 orig_bytes=a.original.read_bytes();candidate_bytes=a.candidate.read_bytes()
 check(sha(orig_bytes)==ORIGINAL and sha(candidate_bytes)==CANDIDATE,'EXACT_FLAZ_AND_CANDIDATE_HASH')
 results=[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=a.chromium,
     args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'])
  try:
   for mode in MODES:
    for arena in ARENAS:
     before,errors_before=contact(browser,orig_bytes.decode('utf8'),mode,arena)
     after,errors_after=contact(browser,candidate_bytes.decode('utf8'),mode,arena)
     check(any('creature21 is not defined' in e for e in errors_before),
           'PROTECTED_VISUAL_SCOPE_BUG_NOT_OBSERVED')
     check(not errors_after,'CANDIDATE_BROWSER_ERROR')
     proof=compare(before,after)
     results.append({'mode':mode,'arena':arena,'status':'SCOPED_PASS',
                     'steps':STEPS,'virtual_dt':1/120,**proof})
  finally: browser.close()
 check(sha(a.original.read_bytes())==ORIGINAL and sha(a.candidate.read_bytes())==CANDIDATE,
       'PROTECTED_SOURCE_CHANGED')
 receipt={'schema':'JM.REA.COMBOUND.MultiTurnConsequenceParity/0.9',
  'status':'SCOPED_PASS','case_count':len(results),
  'checkpoint_comparisons':sum(r['checkpoints'] for r in results),
  'virtual_simulation_steps_per_case':STEPS,
  'original_sha256':ORIGINAL,'candidate_sha256':CANDIDATE,
  'originals_untouched':True,'rea_private_analysis_proven':False,
  'physical_device_proven':False,'full_match_win_loss_proven':False,
  'method':'HEADLESS_CHROMIUM_DETERMINISTIC_VIRTUAL_CLOCK_AND_MANUAL_STEP',
  'cases':results}
 with a.receipt.open('x',encoding='utf8') as f:
  json.dump(receipt,f,indent=2)
  f.write('\n')
 print('JM_COMBOUND_MULTITURN_PARITY: 4/4 cases; 84/84 checkpoints; AI preview, enemy shot, return turn')
if __name__=='__main__':
 main()
