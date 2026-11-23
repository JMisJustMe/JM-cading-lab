# JM Fresh App Lab CP02 source/continuity proof. Synthetic test data only; no live/private owner stores.\n# Run after: python -m playwright install chromium, python fresh-app-lab/test_continuity_cp02.py\nfrom pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import os,json
root=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=s.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{s.server_address[1]}/index.html'
checks=0
def check(expr,desc):
 global checks
 assert expr,desc
 checks+=1
 print('PASS',desc,flush=True)
slugs='task flex diy social nearby beat trace learning debate body sports portfolio'.split()
try:
 with sync_playwright() as pw:
  local_browser=Path(os.environ.get('JM_CHROMIUM_PATH','')) if os.environ.get('JM_CHROMIUM_PATH') else Path(os.environ.get('LOCALAPPDATA','/nonexistent'))/'ms-playwright'/'chromium-1181'/'chrome-win'/'chrome.exe'
  b=pw.chromium.launch(headless=True,**({'executable_path':str(local_browser)} if local_browser.is_file() else {}))
  for vp in [{'width':390,'height':844},{'width':840,'height':360},{'width':1280,'height':800}]:
   c=b.new_context(viewport=vp,accept_downloads=True)
   p=c.new_page()
   errors=[]
   p.on('pageerror',lambda err:errors.append(str(err)))
   p.goto(url)
   size=str(vp['width'])+'x'+str(vp['height'])
   check(p.locator('section.app').count()==12,size+' original 12 bodies')
   check(p.locator('[data-open]').count()==12,size+' original launcher entrances')
   check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),size+' no document overflow')
   check(p.evaluate('Math.min(...Array.from(document.querySelectorAll("button")).filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect().height))>=43.9'),size+' touch targets')
   check(p.locator('#labRawRecoveryBtn').is_hidden(),size+' raw recovery hidden when healthy')
   for slug in slugs:
    p.locator('[data-open="'+slug+'"]').click()
    check(p.locator('#app-'+slug+'.active').count()==1,size+' '+slug+' body opens')
    p.locator('#app-'+slug+' [data-back]').click()
   check(p.locator('#hub').is_visible(),size+' hub return')
   check(not errors,size+' no JS pageerrors')
   c.close()
  c=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
  p=c.new_page()
  bad='{OWNER_ORIGINAL_UNREADABLE_SAVE_FIRST'
  p.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('jm_tp_tasks',{json.dumps(bad)});localStorage.setItem('unrelated-keeper','DO_NOT_TOUCH');sessionStorage.setItem('seeded','1')}}")
  p.goto(url)
  check('SOURCE HOLD' in p.locator('#labStoreStatus').inner_text(),'malformed original task state detected')
  check(p.locator('#labRawRecoveryBtn').is_visible(),'raw recovery entrance visible')
  p.locator('[data-open="task"]').click()
  p.locator('#tpTask').fill('IN_SESSION_NOT_A_DING')
  p.locator('#tpAdd').click()
  check(p.evaluate("localStorage.getItem('jm_tp_tasks')")==bad,'unreadable original bytes protected against task overwrite')
  check('STORAGE HOLD' in p.locator('#labStoreStatus').inner_text(),'other group success cannot dismiss storage HOLD')
  check(p.locator('#labStoreStatus.warn').count()==1,'HOLD visually marked')
  with p.expect_download() as ev:p.locator('#labRawRecoveryBtn').click()
  out=json.loads(Path(ev.value.path()).read_bytes().decode('utf-8'))
  check(out['schema']=='jm.fresh-app-lab.raw-recovery/1' and out['readOnly'] is True,'private read-only raw envelope')
  check(out['entries']['jm_tp_tasks']==bad,'download contains exact malformed original text')
  check(len(out['entries'])==13,'recovery covers all 13 original local keys')
  check('jm_tp_tasks' in out['heldKeys'],'source HOLD independently recorded')
  check(p.evaluate("localStorage.getItem('unrelated-keeper')")=='DO_NOT_TOUCH','unrelated original key preserved')
  p.reload()
  check(p.evaluate("localStorage.getItem('jm_tp_tasks')")==bad,'source survives full reload')
  check('SOURCE HOLD' in p.locator('#labStoreStatus').inner_text(),'source HOLD survives reload')
  backup={'schema':'jm.fresh-app-lab.local-backup/1','entries':{'jm_tp_tasks':json.dumps([{'t':'RECOVERED_FROM_OWNER_BACKUP','lane':'Build','done':False,'at':'synthetic'}])}}
  p.once('dialog',lambda d:d.accept())
  p.locator('#labRestoreFile').set_input_files({'name':'saved-copy.json','mimeType':'application/json','buffer':json.dumps(backup).encode('utf8')})
  p.wait_for_function("()=>{try{return JSON.parse(localStorage.getItem('jm_tp_tasks'))?.[0]?.t==='RECOVERED_FROM_OWNER_BACKUP'}catch{return false}}")
  check(p.evaluate("JSON.parse(localStorage.getItem('jm_tp_tasks'))[0].t")=='RECOVERED_FROM_OWNER_BACKUP','explicit restore allows deliberate repair')
  c.close()
  c=b.new_context(viewport={'width':390,'height':844})
  p=c.new_page()
  p.add_init_script("localStorage.setItem('jm_diy_plan','{\"name\":\"OWNER WRONG SHAPE\"}')")
  p.goto(url)
  check('SOURCE HOLD' in p.locator('#labStoreStatus').inner_text(),'parseable but invalid original state held')
  check(p.evaluate("localStorage.getItem('jm_diy_plan')")=='{"name":"OWNER WRONG SHAPE"}','invalid-shaped original exact bytes protected')
  c.close()
  c=b.new_context(viewport={'width':390,'height':844})
  p=c.new_page()
  p.goto(url)
  p.locator('[data-open=task]').click()
  p.evaluate("""()=>{window.__setter=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='jm_tp_tasks')return;return window.__setter.call(this,k,v)}}""")
  p.locator('#tpTask').fill('UNCOMMITTED_SILENT')
  p.locator('#tpAdd').click()
  check(p.evaluate("localStorage.getItem('jm_tp_tasks')") is None,'silent no-op storage write cannot create saved task')
  check('STORAGE HOLD' in p.locator('#labStoreStatus').inner_text(),'silent write issue persists as visible HOLD')
  p.evaluate("()=>{Storage.prototype.setItem=window.__setter;return true}")
  p.locator('#tpTask').fill('RETRY_SAVED')
  p.locator('#tpAdd').click()
  check(p.evaluate("JSON.parse(localStorage.getItem('jm_tp_tasks')).some(x=>x.t==='RETRY_SAVED')"),'storage retry works after backend recovery')
  p.reload()
  p.locator('[data-open=task]').click()
  check(p.locator('#tpTasks').inner_text().find('RETRY_SAVED')>=0,'recovered task survives reload')
  c.close()
  b.close()
finally:s.shutdown()
print('COMPLETE',checks,'assertions')
