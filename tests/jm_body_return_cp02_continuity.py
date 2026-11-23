# Existing BUILT ENOUGH: BODY RETURN source regression. Synthetic data only; distinct original creation.
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
from datetime import date,timedelta
import os,json
root=Path(__file__).resolve().parents[1]/'fresh-app-lab'/'body-return-v0.1'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=srv.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{srv.server_address[1]}/index.html'
key='shims-body-return-live-v01'
count=0
def check(yes,label):
 global count
 assert yes,label
 count+=1
 print('PASS',label,flush=True)
def start(page):
 page.goto(url)
 page.locator('[data-tab=setup]').click()
def adult_form(page,dob='1990-01-01',push='12',core='12',walk='20'):
 page.locator('[name=dob]').fill(dob)
 page.locator('[name=push]').fill(push)
 page.locator('[name=core]').fill(core)
 page.locator('[name=walk]').fill(walk)
 page.locator('#form button.primary').click()
try:
 with sync_playwright() as pw:
  browser_path=Path(os.environ.get('JM_CHROMIUM_PATH','')) if os.environ.get('JM_CHROMIUM_PATH') else Path(os.environ.get('LOCALAPPDATA','/nonexistent'))/'ms-playwright'/'chromium-1181'/'chrome-win'/'chrome.exe'
  b=pw.chromium.launch(headless=True,**({'executable_path':str(browser_path)} if browser_path.is_file() else {}))
  for vp in [{'width':390,'height':844},{'width':840,'height':360},{'width':1280,'height':800}]:
   c=b.new_context(viewport=vp,accept_downloads=True)
   p=c.new_page()
   errors=[]
   p.on('pageerror',lambda x:errors.append(str(x)))
   p.goto(url)
   label=str(vp['width'])+'x'+str(vp['height'])
   check(p.locator('[data-tab]').count()==3,label+' original three navigation tabs')
   check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),label+' no horizontal overflow')
   check(p.evaluate('Math.min(...Array.from(document.querySelectorAll("button")).filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect().height))>=43.9'),label+' touch buttons >=44px')
   for tab in ['setup','record','today']:
    p.locator('[data-tab='+tab+']').click()
    check(p.locator('#'+tab+'.on').count()==1,label+' '+tab+' tab visible')
   check(not errors,label+' no JS errors on boot/navigation')
   c.close()
  c=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
  p=c.new_page()
  raw='{OWNER_SYNTHETIC_CORRUPT_BYTES_KEEP_EXACT'
  p.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem({json.dumps(key)},{json.dumps(raw)});sessionStorage.setItem('seeded','1')}}")
  errors=[]
  p.on('pageerror',lambda x:errors.append(str(x)))
  start(p)
  check(not errors,'corrupt source boot does not crash')
  check('SOURCE HOLD' in p.locator('#stateNotice').inner_text(),'source HOLD shown')
  check(p.locator('#exportRaw').is_visible(),'raw recovery offered')
  adult_form(p)
  check(p.evaluate('(k)=>localStorage.getItem(k)',key)==raw,'create routine cannot overwrite corrupt source')
  check(p.locator('#routine').is_hidden(),'routine not crowned from corrupt source')
  with p.expect_download() as dl:p.locator('#exportRaw').click()
  data=json.loads(Path(dl.value.path()).read_bytes().decode('utf-8'))
  check(data['schema']=='shims.body-return.raw-recovery/1' and data['readOnly'] is True,'private raw recovery envelope')
  check(data['key']==key and data['raw']==raw,'download raw exact string')
  check(p.evaluate('(k)=>localStorage.getItem(k)',key)==raw,'raw export does not mutate original')
  p.reload()
  check(p.evaluate('(k)=>localStorage.getItem(k)',key)==raw,'raw source preserved on reload')
  c.close()
  today=date.today()
  born18=today.replace(year=today.year-18)
  almost18=born18+timedelta(days=1)
  c=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
  p=c.new_page()
  start(p)
  adult_form(p,dob=almost18.isoformat(),push='0',core='0',walk='1')
  check(p.locator('#routine').is_hidden(),'17-year-old birthday tomorrow correctly denied')
  check('18th birthday' in p.locator('#stateNotice').inner_text(),'denial has actual birthday reason')
  check(p.evaluate('(k)=>localStorage.getItem(k)',key) is None,'age denial does not create user state')
  adult_form(p,dob=born18.isoformat(),push='0',core='0',walk='1')
  check(p.locator('#routine').is_visible(),'adult on exact 18th birthday accepted')
  result=p.locator('#list').inner_text()
  check('Skip today' in result,'zero comfortable capacity produces skips, not forced reps')
  check('Self-paced only' in result,'unmeasured leg lane is not assigned false reps')
  check('3 minutes' not in result,'one-minute capacity is not inflated to three')
  saved=p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key)
  check(saved['r']['rounds']==1,'very low capacity reduces symbolic rounds to one')
  c.close()
  c=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
  p=c.new_page()
  errors=[]
  p.on('pageerror',lambda x:errors.append(str(x)))
  start(p)
  adult_form(p)
  check(p.locator('#routine').is_visible(),'adult route generated')
  before=p.evaluate('(k)=>localStorage.getItem(k)',key)
  p.evaluate("""key=>{window.__save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return window.__save.call(this,k,v)}}""",key)
  p.locator('.tick').first.click()
  check(p.evaluate('(k)=>localStorage.getItem(k)',key)==before,'tick quota cannot alter saved source')
  check('SAVE HOLD' in p.locator('#stateNotice').inner_text(),'tick save failure visibly held')
  check(not p.locator('.exercise').first.get_attribute('class').find('done')>=0,'tick failure reverted in-session completion')
  p.evaluate('()=>{Storage.prototype.setItem=window.__save;return true}')
  total=p.locator('.tick').count()
  for i in range(total):p.locator('.tick').nth(i).click()
  check(p.locator('#finish').is_enabled(),'complete button enabled by checked activities')
  saved_before=p.evaluate('(k)=>localStorage.getItem(k)',key)
  p.evaluate("""key=>{window.__save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)return;return window.__save.call(this,k,v)}}""",key)
  p.on('dialog',lambda d:d.accept('6') if d.type=='prompt' else d.dismiss())
  p.locator('#finish').click()
  check(p.evaluate('(k)=>localStorage.getItem(k)',key)==saved_before,'ignored completion save cannot replace persisted bytes')
  check('SAVE HOLD' in p.locator('#stateNotice').inner_text(),'no false completion receipt on storage failure')
  check(p.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).h.length',key)==0,'no XP receipt when uncommitted')
  p.evaluate('()=>{Storage.prototype.setItem=window.__save;return true}')
  p.locator('#finish').click()
  after=p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key)
  check(len(after['h'])==1 and after['xp']>0,'completion stored and read back once after recovery')
  check(p.locator('#record.on').count()==1,'successful completion returns to real record')
  p.reload()
  check('RPE 6/10' in p.locator('#history').inner_text(),'completion receipt survives reload')
  with p.expect_download() as dl:p.locator('#exportBackup').click()
  backup=json.loads(Path(dl.value.path()).read_bytes().decode('utf-8'))
  check(backup['schema']=='shims.body-return.local-backup/1','private backup schema correct')
  check(backup['state']['xp']==after['xp'],'downloaded backup carries exact stored XP')
  check(not errors,'no JS pageerrors in real session')
  c.close()
  b.close()
finally:srv.shutdown()
print('COMPLETE',count,'assertions')
