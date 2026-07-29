#!/usr/bin/env python3
import json, os, pathlib, sys, time
from playwright.sync_api import sync_playwright
source_path=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); url='setContent:'+source_path.name
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']}
 exe=os.environ.get('CHROMIUM_PATH')
 if exe: launch['executable_path']=exe
 elif pathlib.Path('/usr/bin/chromium').exists(): launch['executable_path']='/usr/bin/chromium'
 b=p.chromium.launch(**launch)
 page=b.new_page(viewport={'width':1280,'height':900})
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(source_path.read_text(encoding='utf-8'),wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function("window.__JM_ADAPTER_PROOF__ && window.__JM_ADAPTER_PROOF__.rt.library.size===2",timeout=60000)
 page.click('#launchGameBtn');page.wait_for_selector('iframe:not([hidden])',timeout=60000)
 page.wait_for_function("window.__JM_ADAPTER_PROOF__.currentFrame()?.contentDocument?.title?.includes('T-Boys: Core Clash')",timeout=120000)
 token1=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().dataset.sessionToken")
 canvas=page.evaluate("!!window.__JM_ADAPTER_PROOF__.currentFrame().contentDocument.querySelector('canvas#game')")
 page.click('#holdBtn');page.click('#resumeGameBtn');token2=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().dataset.sessionToken")
 page.click('#launchProbeBtn');page.wait_for_function("!!window.__JM_ADAPTER_PROOF__.currentFrame()?.contentWindow?.__JM_PROBE__",timeout=30000)
 page.click('#actionBtn'); action_status=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().contentDocument.querySelector('#status').textContent")
 page.click('#writeSaveBtn');page.click('#captureBtn')
 vault=page.evaluate("window.__JM_ADAPTER_PROOF__.rt.inspect('jm.sovereign.save-probe').vault")
 before=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().contentWindow.localStorage.getItem('JM_SOVEREIGN_SAVE_PROBE')")
 page.click('#clearBtn');cleared=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().contentWindow.localStorage.getItem('JM_SOVEREIGN_SAVE_PROBE')")
 page.click('#restoreBtn');restored=page.evaluate("window.__JM_ADAPTER_PROOF__.currentFrame().contentWindow.localStorage.getItem('JM_SOVEREIGN_SAVE_PROBE')")
 check=page.evaluate("window.__JM_ADAPTER_PROOF__.selfCheck()")
 receipt=page.evaluate("window.__JM_ADAPTER_PROOF__.rt.proofReceipt()")
 result={'status':'PASS','url':url,'tboysCanvas':canvas,'sameFrameQuickResume':token1==token2,'sessionToken':token1,'bridgeActionStatus':action_status,'vault':vault,'saveBeforeClear':before,'saveCleared':cleared is None,'saveRestoredExact':restored==before,'selfCheck':check,'pageErrors':errors,'runtimeReceipt':receipt}
 if not all([canvas,token1==token2,'ACTION FIRE' in action_status,vault and 'JM_SOVEREIGN_SAVE_PROBE' in vault['keys'],cleared is None,restored==before,check['pass']]): result['status']='HOLD'
 out.write_text(json.dumps(result,indent=2))
 b.close()
 if result['status']!='PASS': raise SystemExit(json.dumps(result,indent=2))
 print('LIVE_HTML_BODY_BOOT PASS');print('SAME_FRAME_QUICK_RESUME PASS');print('ADDITIVE_CONTROL_BRIDGE PASS');print('EXACT_TOUCHED_KEY_SAVE_VAULT PASS');print('SAVE_VAULT_RESTORE PASS');print('NO_DEAD_BUTTONS PASS');print('SOVEREIGN_HTML_ADAPTER_BROWSER_DING PASS')
