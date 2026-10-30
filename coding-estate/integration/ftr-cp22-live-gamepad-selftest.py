"""CP22: real FTR browser runtime, synthetic Gamepad API (NOT physical controller).
Standard mapping/buttons exercise original world and native JM recipients.
Never calls FTR.test, mutates game actors, injects gameplay rewards or claims a handset.
"""
import json, os, time
from playwright.sync_api import sync_playwright
URL=os.environ.get('JM_FTR_URL','http://127.0.0.1:8765/estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/index.html')
checks=[]
def check(test,label):
    assert test, label
    checks.append(label)
def press(page,n,delay=.13):
    page.evaluate("(n)=>window.__pad.buttons[n].pressed=true",n)
    page.wait_for_timeout(int(delay*1000))
    page.evaluate("(n)=>window.__pad.buttons[n].pressed=false",n)
    page.wait_for_timeout(90)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel=os.environ.get('JM_FTR_BROWSER','msedge'),headless=True)
    context=browser.new_context(viewport={"width":1280,"height":720})
    page=context.new_page()
    faults=[]
    page.on('pageerror',lambda e:faults.append(str(e)))
    page.on('response',lambda r:faults.append('HTTP '+str(r.status)+' '+r.url) if r.status>=400 else None)
    page.add_init_script("""(()=>{
      const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
      window.__pad={index:0,connected:true,mapping:'standard',
       axes:[0,0,0,0],buttons};
      Object.defineProperty(navigator,'getGamepads',{
       configurable:true,value:()=>[window.__pad]});
    })();""")
    page.goto(URL,wait_until='load')
    page.wait_for_timeout(1400)
    print('CP22_BOOT_DIAGNOSTIC',page.evaluate("({game:!!window.FTR, pad:!!window.FTRGamepad, echo:!!window.JMFTREcho, cover:!!window.JMFTRCover, native:!!window.JMFTRNative, title:document.title, body:document.body.innerText.slice(0,100)})"),faults,flush=True)
    page.wait_for_function("!!window.FTRGamepad && !!window.JMFTREcho && !!window.JMFTRCover && !!window.JMFTRNative",timeout=10000)
    status=page.evaluate("window.FTRGamepad.status()")
    check(status['connected'] and not status['physicalContactClaim'],'synthetic controller recognised without physical claim')
    check(page.locator('#jmControllerStatus').inner_text().startswith('PAD CONNECTED'),'in-world controller status visible')
    press(page,9)
    check(page.evaluate("window.FTR.state().running"),'Menu mounts real original FTR run')
    first=page.evaluate("window.FTR.state().player")
    page.evaluate("window.__pad.axes[1]=-1")
    page.wait_for_timeout(450)
    page.evaluate("window.__pad.axes[1]=0")
    page.wait_for_timeout(90)
    moved=page.evaluate("window.FTR.state().player")
    distance=((moved['x']-first['x'])**2+(moved['y']-first['y'])**2)**.5
    check(distance>.04,'left stick changes actual original world coordinates')
    page.evaluate("window.__pad.axes[2]=.8")
    page.wait_for_timeout(320)
    page.evaluate("window.__pad.axes[2]=0")
    aimed=page.evaluate("window.FTR.state().player")
    check(abs(aimed['a']-moved['a'])>.02,'right stick turns actual original first-person view')
    press(page,0)
    check(page.evaluate("window.FTRGamepad.status().counts.fire")>=1,'A reaches source-owned FIRE command')
    press(page,1)
    check(page.evaluate("window.FTRGamepad.status().counts.phase")>=1,'B reaches original PHASE')
    press(page,2)
    press(page,3)
    press(page,4)
    check(page.evaluate("window.FTRGamepad.status().counts.scan")>=1,'X original SCAN')
    check(page.evaluate("window.FTRGamepad.status().counts.side")>=1,'Y original SIDE')
    check(page.evaluate("window.FTRGamepad.status().counts.flow")>=1,'LB original FLOW')
    material_before=page.evaluate("window.JMFTRCover.state().selected")
    press(page,14)
    material_after=page.evaluate("window.JMFTRCover.state().selected")
    check(material_before!=material_after,'D-pad left changes REAL JM Cover Forge material')
    press(page,12)
    echo=page.evaluate("window.JMFTREcho.last()")
    check(echo is not None and echo['status'] in ('LAUNCHED','DENIED'),
       'D-pad up triggers real world Echo through existing UI')
    press(page,13)
    cover=page.evaluate("window.JMFTRCover.last()")
    check(cover is not None and cover['status'] in ('BUILT','DENIED'),
       'D-pad down reaches actual JM Cover Forge gate')
    press(page,15)
    pulse=page.evaluate("window.JMFTRNative.last()")
    check(pulse is not None and pulse['status'] in ('APPROVED','DENIED'),
       'D-pad right reaches sovereign native Core Pulse gate')
    page.evaluate("window.__pad.buttons[5].pressed=true")
    page.wait_for_timeout(140)
    check(page.evaluate("window.FTRGamepad.status().traceHeld"),'RB actually holds original TRACE')
    page.evaluate("window.__pad.connected=false")
    page.wait_for_timeout(160)
    st=page.evaluate("window.FTRGamepad.status()")
    check(not st['traceHeld'] and not st['connected'] and st['counts']['traceRelease']>=1,
       'loss of gamepad releases original TRACE')
    check(st['counts']['safetyReleases']>=1,'loss of gamepad emits safe zero movement')
    page.evaluate("window.__pad.connected=true;window.__pad.mapping='nonstandard'")
    page.wait_for_timeout(160)
    check(page.evaluate("window.FTRGamepad.status().unsupported"),
       'unknown mapping explicitly held, not silently guessed')
    page.evaluate("window.__pad.mapping='standard'")
    page.wait_for_timeout(120)
    page.evaluate("window.__pad.buttons[5].pressed=true")
    page.wait_for_timeout(130)
    check(page.evaluate("window.FTRGamepad.status().traceHeld"),'gamepad reconnect permits TRACE')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.wait_for_timeout(120)
    st=page.evaluate("window.FTRGamepad.status()")
    check(not st['traceHeld'] and st['suspended'],'blur releases active TRACE and suspends input')
    page.evaluate("window.__pad.buttons[5].pressed=false;window.dispatchEvent(new Event('focus'))")
    page.wait_for_timeout(130)
    check(not page.evaluate("window.FTRGamepad.status().suspended"),'focus resumes real input polling')
    check(not faults,'no page JavaScript errors or resource failures: '+str(faults))
    result={"schema":"jm.ftr.cp22.browser-gamepad-contact/1.0",
            "passed":len(checks),"checks":checks,
            "movementUnits":round(distance,3),
            "echo":echo['status'],"cover":cover['status'],"nativePulse":pulse['status'],
            "originalFTR":page.evaluate("window.FTR.version"),
            "controllerInput":"SYNTHETIC_STANDARD_GAMEPAD_API",
            "physicalDevice":"NOT_TESTED","gardlesNative":"NOT_TESTED",
            "errors":faults}
    print('JM_FTR_CP22_BROWSER_RESULT',json.dumps(result),flush=True)
    context.close()
    # Stronger CP22: controller axes alone reach live original Core A; RB + B +
    # D-pad Echo attempt original earned Quiet mechanic. No FTR.command or FTR.test.
    source_ctx=browser.new_context(viewport={"width":1280,"height":720})
    source_page=source_ctx.new_page()
    source_faults=[]
    source_page.on('pageerror',lambda e:source_faults.append(str(e)))
    source_page.add_init_script("""(()=>{
      const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
      window.__pad={index:0,connected:true,mapping:'standard',
       axes:[0,0,0,0],buttons};
      Object.defineProperty(navigator,'getGamepads',{
       configurable:true,value:()=>[window.__pad]});
    })();""")
    source_page.goto(URL,wait_until='load')
    source_page.wait_for_function("!!window.JMFTRQuietTrace && !!window.JMFTREcho && !!window.FTRGamepad")
    press(source_page,9)
    for goal in ((12.4,17.2),(12.4,15.4),(14.4,15.4)):
        reached=False
        for _ in range(110):
            snap=source_page.evaluate("""([x,y])=>{
              const s=window.FTR.state(),p=s.player,dx=x-p.x,dy=y-p.y;
              const d=Math.hypot(dx,dy);
              if(d>.22&&s.running){
                const f=(dx*Math.cos(p.a)+dy*Math.sin(p.a))/d;
                const side=(dx*Math.cos(p.a+Math.PI/2)+dy*Math.sin(p.a+Math.PI/2))/d;
                window.__pad.axes[0]=side;window.__pad.axes[1]=-f;
              }else {window.__pad.axes[0]=0;window.__pad.axes[1]=0}
              return {d,run:s.running,coords:[p.x,p.y]};
            }""",list(goal))
            if snap['d']<.22:
                reached=True
                break
            if not snap['run']:
                break
            source_page.wait_for_timeout(70)
        check(reached,'controller-only original MOVE reaches world waypoint '+str(goal))
    source_page.evaluate("window.__pad.axes[0]=0;window.__pad.axes[1]=0;window.__pad.buttons[5].pressed=true")
    source_page.wait_for_timeout(250)
    check(source_page.evaluate("window.FTR.state().cores[0].progress")>.15,
          'controller RB gains authentic Core A TRACE progress')
    press(source_page,1)
    press(source_page,12)
    launched=source_page.evaluate("window.JMFTREcho.last()")
    check(launched is not None and launched['status']=='LAUNCHED',
          'controller D-pad actually launches original-world Echo near Core A')
    source_page.wait_for_timeout(850)
    source_page.evaluate("window.__pad.buttons[5].pressed=false")
    source_page.wait_for_timeout(180)
    world=source_page.evaluate("""()=>({
      s:window.FTR.state(),quiet:window.JMFTRQuietTrace.state(),
      pad:window.FTRGamepad.status(),echo:window.JMFTREcho.last()
    })""")
    print('JM_FTR_CP22_WORLD_DIAGNOSTIC',json.dumps({'quiet':world['quiet'],'echo':world['echo'],'events':world['s']['run']['events'][-6:],'cores':world['s']['cores'],'pad':world['pad']}),flush=True)
    check(world['s']['cores'][0]['active'] and world['s']['player']['cores']>=1,
          'real original Core A mounted through controller-only input')
    check(any(x.get('id')=='A' and x.get('awarded') for x in world['quiet']['earnedCredits']),
          'real +180 Quiet Trace reward earned by controller Phase/Echo/RB')
    check(not source_faults,'controller natural encounter no JavaScript exceptions')
    print('JM_FTR_CP22_REAL_WORLD_CONTROLLER',json.dumps({
       'originalCoreA':world['s']['cores'][0]['active'],
       'quietEarned':world['quiet']['earnedCredits'],
       'echoStatus':world['echo']['status'],
       'score':world['s']['player']['score'],
       'integrity':world['s']['player']['hp'],
       'controllerOnly':True,'physicalGamepad':'NOT_TESTED',
       'errors':source_faults}),flush=True)
    source_ctx.close()
    browser.close()
