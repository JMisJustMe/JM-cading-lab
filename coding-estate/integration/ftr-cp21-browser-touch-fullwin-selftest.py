"""JM FTR CP21 source-only real browser-touch full victory; emulation NOT physical phone.
Only original joystick, TRACE, PHASE and ECHO touchscreen inputs drive game.
Read-only gameplay state observation chooses ordinary navigational waypoints.
"""
from playwright.sync_api import sync_playwright
from time import monotonic, sleep
import json,math,os
URL=os.environ.get('JM_FTR_URL','http://127.0.0.1:8765/estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/index.html')
WAYPOINTS=[[12.4,17.2],[12.4,15.4],[14.4,15.4]]
def touch(cdp,typ,points):
 cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[{'x':q['x'],'y':q['y'],'id':q['id']} for q in points]})
def c(box,id):
 return {'id':id,'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel=os.environ.get('JM_FTR_BROWSER','msedge'))
 context=browser.new_context(viewport={'width':393,'height':873},is_mobile=True,has_touch=True,device_scale_factor=1)
 page=context.new_page()
 errors=[];bad=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('response',lambda r: bad.append({'code':r.status,'url':r.url}) if r.status>=400 else None)
 page.goto(URL,wait_until='load',timeout=20000)
 page.wait_for_function('window.FTR && window.JMFTRDevice && window.JMFTREcho')
 page.locator('#startBtn').tap()
 original_started=page.evaluate('()=>FTR.state().run.started')
 joy=page.locator('#joy').bounding_box();act=page.locator('#act').bounding_box()
 print('INITIAL',json.dumps({'joy':joy,'act':act,'state':page.evaluate('()=>window.FTR.state().player'),'errors':errors,'bad':bad}),flush=True)
 cd=context.new_cdp_session(page);j=c(joy,1);a=c(act,9)
 touch(cd,'touchStart',[j])
 for goal in WAYPOINTS:
  start=monotonic();old=None;stuck=0;last=None
  for i in range(150):
   x=page.evaluate('''([tx,ty])=>{const s=FTR.state(),p=s.player;return {x:p.x,y:p.y,a:p.a,hp:p.hp,running:s.running,core:p.cores,phase:p.phase,d:Math.hypot(tx-p.x,ty-p.y)}}''',goal)
   if x['d']<.24:
    print('REACHED',goal,'steps',i,'state',x,flush=True);break
   if not x['running'] or x['hp']<=0:raise Exception('GAME_DIED:'+json.dumps(x))
   dx=goal[0]-x['x'];dy=goal[1]-x['y'];dist=math.hypot(dx,dy)
   f=(dx*math.cos(x['a'])+dy*math.sin(x['a']))/dist
   side=(dx*math.cos(x['a']+math.pi/2)+dy*math.sin(x['a']+math.pi/2))/dist
   radius=joy['width']*.26
   move={'id':1,'x':j['x']+side*radius,'y':j['y']-f*radius}
   touch(cd,'touchMove',[move]); sleep(.095)
   if old and math.hypot(x['x']-old[0],x['y']-old[1])<.006: stuck+=1
   else: stuck=0
   if stuck>25:raise Exception('STUCK:'+json.dumps({'goal':goal,'x':x,'move':move}))
   old=(x['x'],x['y']);last=x
  else:raise Exception('WAYPOINT_TIMEOUT:'+json.dumps({'goal':goal,'last':last}))
 touch(cd,'touchEnd',[])
 print('ARRIVAL',json.dumps(page.evaluate('''() => ({player:FTR.state().player,cores:FTR.state().cores,events:FTR.state().run.events.slice(-4)})''')),flush=True)
 touch(cd,'touchStart',[a])
 page.wait_for_timeout(500)
 touch(cd,'touchEnd',[])
 print('TRACE500',json.dumps(page.evaluate('''() => ({progress:FTR.state().cores[0].progress,phase:FTR.state().player.phase,core:FTR.state().player.cores})''')),flush=True)
 page.locator('#phase').tap()
 page.locator('#jmEchoLaunch').tap()
 print('DISTRACTION',json.dumps(page.evaluate('''() => ({echo:JMFTREcho.state(),eligibility:JMFTRQuietTrace.eligibility(),phase:FTR.state().player.phase})''')),flush=True)
 touch(cd,'touchStart',[a])
 page.wait_for_timeout(900)
 touch(cd,'touchEnd',[])
 print('FINAL',json.dumps(page.evaluate('''() => ({player:FTR.state().player,cores:FTR.state().cores,events:FTR.state().run.events.filter(e=>['CORE_MOUNT','JM_QUIET_CORE_MOUNT'].includes(e.event)),earned:JMFTRQuietTrace.state(),device:JMFTRDevice.state()})'''),default=str)[:5500],flush=True)

 # Continue this SAME original run to Core B and real extraction using true touch events.
 def route_to(goal,step_limit=155):
  start=monotonic();stuck=0;old=None;done=False;last=None
  touch(cd,'touchStart',[j])
  for i in range(step_limit):
   v=page.evaluate('''([tx,ty])=>{const g=FTR.state(),p=g.player;return {x:p.x,y:p.y,a:p.a,hp:p.hp,phase:p.phase,cores:p.cores,running:g.running,won:g.run.events.some(e=>e.event==='RUN_END'&&e.win),d:Math.hypot(tx-p.x,ty-p.y)}}''',goal)
   last=v
   if v['won'] or v['d']<.24:
    done=True;break
   if not v['running'] or v['hp']<=0:break
   if v['hp']<=62 and v['phase']<=0:
    touch(cd,'touchEnd',[])
    page.locator('#phase').tap()
    touch(cd,'touchStart',[j])
   dx=goal[0]-v['x'];dy=goal[1]-v['y'];dist=math.hypot(dx,dy)
   f=(dx*math.cos(v['a'])+dy*math.sin(v['a']))/dist
   side=(dx*math.cos(v['a']+math.pi/2)+dy*math.sin(v['a']+math.pi/2))/dist
   radius=joy['width']*.26
   touch(cd,'touchMove',[{'id':1,'x':j['x']+side*radius,'y':j['y']-f*radius}])
   sleep(.088)
   if old and math.hypot(v['x']-old[0],v['y']-old[1])<.006:stuck+=1
   else:stuck=0
   if stuck>30:break
   old=(v['x'],v['y'])
  touch(cd,'touchEnd',[])
  print('ROUTE',json.dumps({'goal':goal,'steps':i,'done':done,'last':last,'duration':round(monotonic()-start,2)}),flush=True)
  if not done:raise Exception('TOUCH_ROUTE_FAILED:'+json.dumps({'goal':goal,'last':last}))
  return bool(last.get('won'))
 page.wait_for_timeout(1250)
 for goal in [[10.5,15.4],[10.5,11.5],[10.5,9.5],[2.2,9.5],[2.2,2.2]]:
  route_to(goal)
 touch(cd,'touchStart',[a])
 page.wait_for_timeout(1450)
 touch(cd,'touchEnd',[])
 bstate=page.evaluate('''() => ({game:FTR.state(),quiet:JMFTRQuietTrace.state()})''')
 bmount=[e for e in bstate['game']['run']['events'] if e.get('event')=='CORE_MOUNT' and e.get('id')=='B']
 print('CORE_B',json.dumps({'cores':bstate['game']['player']['cores'],'mounted':len(bmount),'hp':bstate['game']['player']['hp']}),flush=True)
 assert len(bmount)==1 and bstate['game']['player']['cores']==2,'REAL_TOUCH_CORE_B_MOUNT_FAILED'
 page.wait_for_timeout(1450)
 for goal in [[2.2,9.5],[10.5,9.5],[14.5,9.5],[14.5,4.5],[17.4,4.4]]:
  if route_to(goal):break
 final=page.evaluate('''() => ({game:FTR.state(),quiet:JMFTRQuietTrace.state(),touch:JMFTRDevice.state()})''')
 gg=final['game'];ev=gg['run']['events']
 won=any(e.get('event')=='RUN_END' and e.get('win') for e in ev)
 assert won and gg['player']['cores']==2 and gg['run']['started']==original_started,'CONTINUOUS_ORIGINAL_TOUCH_VICTORY_NOT_PROVEN'
 assert final['quiet']['completed']==1 and any(e.get('id')=='A' and e.get('awarded') for e in final['quiet']['earnedCredits']),'QUIET_BONUS_CUSTODY_MISSING'
 print('CP21_TOUCH_ONLY_FULL_WIN',json.dumps({'won':won,'time':gg['time'],'score':gg['player']['score'],'integrity':gg['player']['hp'],'cores':gg['player']['cores'],'quietCompleted':final['quiet']['completed'],'touchPresses':final['touch']['presses'],'touchReleases':final['touch']['releases'],'started':original_started,'runEnded':len([e for e in ev if e.get('event')=='RUN_END']),'errors':errors,'bad':bad}),flush=True)

 assert not errors and not bad,'BROWSER_ERRORS_OR_SOURCE_LOAD_FAILURES'
 assert gg['player']['hp']>0 and gg['player']['score']>=2880,'ORIGINAL_WIN_SCORE_OR_INTEGRITY_GATE'
 print('ERRORS',errors,bad,flush=True)
 context.close();browser.close()
