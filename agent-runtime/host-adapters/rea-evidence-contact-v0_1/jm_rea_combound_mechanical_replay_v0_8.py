#!/usr/bin/env python3
"""Read-only protected COMBOUND source-to-independent-physics replay.
Requires local private v2.3 FLAZ, corrected separate descendant and Chromium Playwright.
Game source is never uploaded, copied or modified. This is NOT REA itself.
"""
import argparse, hashlib, json, math
from pathlib import Path
from playwright.sync_api import sync_playwright
ORIG='53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428'
CAND='66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1'
SEED='<script>Math.random=(function(){let s=1234567;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)})();</script>'
def sha(data):return hashlib.sha256(data).hexdigest()
def need(cond,reason):
 if not cond:raise RuntimeError('JM_V08_TRAJECTORY_HOLD:'+reason)
def near(a,b):return math.isclose(a,b,rel_tol=1e-11,abs_tol=1e-9)
def run(browser,html,mode,dx,dy):
 ctx=browser.new_context(viewport={'width':430,'height':932},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 try:
  page.set_content(html.replace('<head>','<head>'+SEED,1),wait_until='domcontentloaded',timeout=30000)
  page.evaluate('(m)=>{save.arena="BLOOM_RING";save.matchStyle=m;save.rivalHouse="RANDOM"}',mode)
  page.locator('#quickBtn').click(timeout=7000)
  state=page.evaluate('''({dx,dy})=>{
   const u=Runtime.active(),rules=JM_IR.rules,f=JM_IR.fighters[u.key],point={x:u.x-dx,y:u.y-dy};
   const initial={actor:u.key,turn:Runtime.state.turn,phase:Runtime.state.phase,
     position:[u.x,u.y],crew:Runtime.state.crewCycle.player.length,
     fields:Runtime.state.tensionFields.length,shotSeq:Runtime.state.shotSeq};
   const mechanics={max_pull:rules.max_pull,aim_power_curve:rules.aim_power_curve,
     launch_speed:rules.launch_speed,launch:f.launch};
   Runtime.beginDrag(u,{x:u.x,y:u.y},14);
   Runtime.moveDrag(point);
   const dragPower=Runtime.state.drag?.power;
   Runtime.releaseDrag(point);
   const shot=Runtime.state.shot;
   return {initial,mechanics,pull:[dx,dy],dragPower,
     final:{shot:shot?{id:shot.id,power:shot.power,vector:shot.vector,
        actor:shot.actor,owner:shot.owner}:null,
       velocity:[u.vx,u.vy],phase:Runtime.state.phase,turns:Runtime.state.stats.turns,
       receipts:Runtime.receipts.filter(x=>x.type==='SHOT_COMMIT').length}};
  }''',{'dx':dx,'dy':dy})
  state['errors']=errors;return state
 finally:page.close();ctx.close()
def predicted(x):
 m=x['mechanics'];dx,dy=x['pull']
 power=max(0,min(1,math.hypot(dx,dy)/m['max_pull']))
 if power<.08:return (power,None)
 length=math.hypot(dx,dy) or 1
 speed=m['launch_speed'] * power**(m['aim_power_curve'] or 1)*m['launch']
 return (power,[dx/length*speed,dy/length*speed])
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--original',required=True,type=Path)
 parser.add_argument('--candidate',required=True,type=Path)
 parser.add_argument('--static-ir',required=True,type=Path)
 parser.add_argument('--receipt',required=True,type=Path)
 parser.add_argument('--chromium',default='/usr/bin/chromium')
 args=parser.parse_args()
 need(args.receipt.is_absolute() and not args.receipt.exists(),'WRITE_ONCE_ABSOLUTE')
 original=args.original.read_bytes();candidate=args.candidate.read_bytes()
 need(sha(original)==ORIG and sha(candidate)==CAND,'SOURCE_HASH')
 ir=json.loads(args.static_ir.read_text())
 need(ir['original_sha256']==ORIG and ir['candidate_sha256']==CAND,'SOURCE_IR_IDENTITY')
 edges=ir.get('call_relationships',ir.get('relationships',[]))
 contacts={(e['from'],e['to']) for e in edges}
 need({('releaseDrag','moveDrag'),('releaseDrag','commitShot'),
       ('commitShot','registerCrewUse')}<=contacts,'SOURCE_RELATIONSHIP_CONTACT')
 pairs=[(85,-50),(125,0),(-90,80),(320,-110),(6,2),(0,-130),(-180,-110)]
 results=[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=args.chromium,
    args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'])
  try:
   for mode in ['CLASSIC','ARCADE']:
    for dx,dy in pairs:
     a=run(browser,original.decode(),mode,dx,dy)
     b=run(browser,candidate.decode(),mode,dx,dy)
     need(a['initial']==b['initial'] and a['mechanics']==b['mechanics'],'INITIAL_STATE_PARITY')
     need(a['dragPower']==b['dragPower'] and a['final']==b['final'],'CONTROL_REGRESSION')
     need(not b['errors'],'CORRECTED_BROWSER_ERRORS')
     need(b['initial']['crew']==0 and b['initial']['fields']==0,'UNEXPECTED_BURST_OR_SNARE')
     power,velocity=predicted(b)
     need(near(power,b['dragPower']),'INDEPENDENT_POWER')
     if velocity is None:
      need(b['final']['shot'] is None and b['final']['receipts']==0,'SHORT_PULL_CANCEL')
     else:
      need(b['final']['receipts']==1 and b['final']['shot']['owner']=='player','SHOT_RECEIPT')
      need(all(near(p,v) for p,v in zip(velocity,b['final']['velocity'])),'INDEPENDENT_VELOCITY')
     results.append({'mode':mode,'drag':[dx,dy],'cancelled':velocity is None,
       'power':power,'game_state_sha256':sha(json.dumps(b['final'],sort_keys=True).encode())})
  finally:browser.close()
 need(sha(args.original.read_bytes())==ORIG and sha(args.candidate.read_bytes())==CAND,'GAME_BODY_CHANGED')
 output={'schema':'JM.REA.COMBOUND.IndependentMechanicalReplay/0.8',
    'engine':'TYPESCRIPT_AST_PLUS_CHROMIUM_NOT_REA',
    'original_sha256':ORIG,'candidate_sha256':CAND,
    'static_ir_sha256':sha(args.static_ir.read_bytes()),'count':len(results),
    'passed':len(results),'cancelled':sum(r['cancelled'] for r in results),
    'modes':['CLASSIC','ARCADE'],'cases':results,
    'source_mutation':False,'scope':'SINGLE_TURN_PHYSICS_NO_FULL_MATCH_OR_DEVICE_CROWN'}
 with args.receipt.open('x',encoding='utf8') as f:json.dump(output,f,indent=2)
 print('JM_COMBOUND_V08_INDEPENDENT_TRAJECTORY_PASS:',len(results),'/',len(results))
if __name__=='__main__':main()
