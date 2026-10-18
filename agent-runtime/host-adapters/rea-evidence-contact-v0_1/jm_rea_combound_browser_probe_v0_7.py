#!/usr/bin/env python3
"""JM × REA v0.7 read-only COMBOUND v2.3 browser contact.
Requires: python -m pip install playwright; Chromium binary on host.
HTML never copied to GitHub, disk or Library. One NEW JSON receipt only.
This is headless Chromium contact, NOT owner-device contact.
"""
import argparse, hashlib, json
from pathlib import Path
from playwright.sync_api import sync_playwright

EXPECTED="53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428"
OLD="const creature23=creature21;\ncreature21=function(u){"
NEW="const creature23=drawUnit;\ndrawUnit=function(u){"
CANDIDATE="66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1"
SEED="""<script>Math.random=(function(){let s=1234567;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})();</script>"""
def sha(x):return hashlib.sha256(x if isinstance(x,bytes) else x.encode("utf-8")).hexdigest()
def contact(browser, html, mode):
 ctx=browser.new_context(viewport={"width":430,"height":932},device_scale_factor=1,
    is_mobile=True,has_touch=True)
 page=ctx.new_page(); errors=[]
 page.on("pageerror",lambda err:errors.append(str(err)))
 try:
  page.set_content(html.replace("<head>","<head>"+SEED,1),
    wait_until="domcontentloaded",timeout=30000)
  meta=page.evaluate("""()=>({motion:window.COMBOUND_V23_BIG_FORM_MOTION?.version||null,
    physicsChanged:window.COMBOUND_V23_BIG_FORM_MOTION?.physicsChanged??null,
    controlsChanged:window.COMBOUND_V23_BIG_FORM_MOTION?.controlsChanged??null,
    fighters:Object.keys(JM_IR.fighters).length,crew:[...save.crew],
    rules:JSON.stringify(JM_IR.rules)})""")
  page.evaluate('(m)=>{save.arena="BLOOM_RING";save.matchStyle=m;save.rivalHouse="RANDOM"}',mode)
  page.locator("#quickBtn").click(timeout=6000);page.wait_for_timeout(120)
  state=page.evaluate("""()=>({phase:Runtime.state.phase,turn:Runtime.state.turn,
    active:Runtime.active()?.key,units:Runtime.state.units.map(u=>[u.key,u.team,u.x,u.y,u.r,u.hp,u.maxHp]),
    arena:Runtime.state.activeArena,paused:Runtime.state.paused,shotSeq:Runtime.state.shotSeq,
    matchStyle:save.matchStyle,stats:Runtime.state.stats})""")
  shot=page.evaluate("""()=>{const u=Runtime.active(),b={x:u.x,y:u.y};
    Runtime.beginDrag(u,{x:u.x,y:u.y},9);
    Runtime.moveDrag({x:u.x-85,y:u.y+50});
    const power=Runtime.state.drag?.power;
    Runtime.releaseDrag({x:b.x-85,y:b.y+50});
    return {power,phase:Runtime.state.phase,shotOwner:Runtime.state.shot?.owner,
     shotPower:Runtime.state.shot?.power,shotVector:Runtime.state.shot?.vector,
     actorKey:u.key,velocity:[u.vx,u.vy],turns:Runtime.state.stats.turns,
     shotReceipts:Runtime.receipts.filter(x=>x.type==='SHOT_COMMIT').length}}""")
  render=page.evaluate("""()=>{let rendered=0,failures=[];
    for(const key of JM_IR.fighterOrder){try{drawUnit(Runtime.createUnit(key,'player',0,
      JM_IR.arena.formations.player[0]));rendered++}catch(e){failures.push(key+':'+e.message)}}
    return {rendered,failures}}""")
  # Additional real canvas PointerEvent route, separate from the controller-call test.
  page.evaluate("Runtime.startMatch()")
  point=page.evaluate("""()=>{const c=document.querySelector('#game'),u=Runtime.active(),
    r=c.getBoundingClientRect();return {x:r.x+u.x*r.width/c.width,
    y:r.y+u.y*r.height/c.height,dx:90*r.width/c.width,dy:55*r.height/c.height}}""")
  page.evaluate("Runtime.state.paused=false")
  for name,x,y in [("pointerdown",point["x"],point["y"]),
                    ("pointermove",point["x"]-point["dx"],point["y"]+point["dy"]),
                    ("pointerup",point["x"]-point["dx"],point["y"]+point["dy"])]:
   page.dispatch_event("#game",name,{"pointerId":55,"pointerType":"touch",
     "isPrimary":True,"clientX":x,"clientY":y,"buttons":0 if name=="pointerup" else 1,
     "bubbles":True})
  pointer=page.evaluate("""()=>({phase:Runtime.state.phase,shotSeq:Runtime.state.shotSeq,
    shotPower:Runtime.state.shot?.power,shotVector:Runtime.state.shot?.vector,
    shotOwner:Runtime.state.shot?.owner,turns:Runtime.state.stats.turns,
    shotReceipts:Runtime.receipts.filter(x=>x.type==='SHOT_COMMIT').length})""")
  return {"meta":meta,"state":state,"shot":shot,"pointer":pointer,"render":render,"errors":errors}
 finally:
  page.close();ctx.close()

def main():
 args=argparse.ArgumentParser(description=__doc__)
 args.add_argument("--body",type=Path,required=True)
 args.add_argument("--receipt",type=Path,required=True)
 args.add_argument("--chromium",default="/usr/bin/chromium")
 p=args.parse_args()
 if not p.body.is_file() or not p.receipt.is_absolute() or p.receipt.exists():
  raise SystemExit("HOLD: real FLAZ source and NEW absolute receipt required")
 raw=p.body.read_bytes()
 if sha(raw)!=EXPECTED:raise SystemExit("HOLD: wrong protected COMBOUND SHA-256")
 text=raw.decode("utf-8")
 if text.count(OLD)!=1 or text.count(NEW):raise SystemExit("HOLD: original scope seam not unique")
 corrected=text.replace(OLD,NEW,1)
 if sha(corrected)!=CANDIDATE:raise SystemExit("HOLD: candidate hash drift")
 result=[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=p.chromium,
   args=["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"])
  try:
   for mode in ["CLASSIC","ARCADE"]:
    original=contact(browser,text,mode)
    newer=contact(browser,corrected,mode)
    errs=[]
    if "creature21 is not defined" not in original["errors"]:errs.append("PARENT_BUG_NOT_OBSERVED")
    if newer["errors"]:errs.append("NEW_BROWSER_ERRORS")
    if newer["meta"]["motion"]!="2.3" or newer["meta"]["physicsChanged"] is not False or newer["meta"]["controlsChanged"] is not False:
     errs.append("VISUAL_MOTION_NOT_REGISTERED")
    if newer["meta"]["fighters"]!=24 or newer["render"]!={"rendered":24,"failures":[]}:
     errs.append("ROSTER_VISUAL_DRIFT")
    for field in ["fighters","crew","rules"]:
     if original["meta"][field]!=newer["meta"][field]:errs.append("CHANGED_"+field)
    if original["state"]!=newer["state"]:errs.append("INITIAL_MATCH_DRIFT")
    if original["shot"]!=newer["shot"]:errs.append("PULL_AIM_RELEASE_DRIFT")
    if original["pointer"]!=newer["pointer"]:errs.append("ACTUAL_POINTER_EVENTS_DRIFT")
    if newer["pointer"]["phase"]!="moving" or newer["pointer"]["shotSeq"]!=1 or newer["pointer"]["shotReceipts"]!=1:errs.append("CANVAS_POINTER_SHOT_NOT_COMMITTED")
    if newer["shot"]["phase"]!="moving" or newer["shot"]["shotReceipts"]!=1:
     errs.append("SHOT_NOT_COMMITTED")
    result.append({"style":mode,"pass":not errs,"holds":errs,
      "source_error":original["errors"],"candidate_errors":newer["errors"],
      "fighters":newer["meta"]["fighters"],"draw_calls":newer["render"]["rendered"],
      "game_state_sha256":sha(json.dumps(newer["state"],sort_keys=True)),
      "shot_state_sha256":sha(json.dumps(newer["shot"],sort_keys=True)),
      "observed_power":newer["shot"]["shotPower"],
      "observed_velocity":newer["shot"]["velocity"],
      "canvas_pointer_power":newer["pointer"]["shotPower"],
      "canvas_pointer_vector":newer["pointer"]["shotVector"],
      "canvas_pointer_receipts":newer["pointer"]["shotReceipts"]})
  finally:browser.close()
 if sha(p.body.read_bytes())!=EXPECTED:raise SystemExit("HOLD: protected file changed")
 report={"schema":"JM.REA.COMBOUND_REAL_GAME_CONTACT/0.7",
   "protected_body":"COMBOUND v2.3 Big Form Motion Language Full Pass · FLAZ 2026-10-11",
   "protected_sha256":EXPECTED,"candidate_in_memory_sha256":CANDIDATE,
   "transformation":"single scope fix creature21 → outer drawUnit wrapper, no gameplay logic edited",
   "scope_diff_occurrences":1,"verified_preserved":True,
   "modes":result,"passed":sum(x["pass"] for x in result),"total":len(result),
   "claim_boundary":"HEADLESS_CHROMIUM_CONTROLLER_AND_RENDER_SMOKE__NOT_OWNER_DEVICE_OR_FULL_MATCH"}
 with p.receipt.open("x",encoding="utf-8") as handle:json.dump(report,handle,indent=2,ensure_ascii=False)
 print("COMBOUND_REAL_GAME_CONTACT:",report["passed"],"/",report["total"])
 for r in result:print(r["style"],"PASS" if r["pass"] else "HOLD",r["holds"])
 if report["passed"]!=report["total"]:raise SystemExit(2)

if __name__=="__main__":main()
