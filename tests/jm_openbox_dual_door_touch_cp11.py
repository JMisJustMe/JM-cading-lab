# JM OPENBOX CP11 two original carrier doors: source-level Android-size and browser proof. Synthetic only.
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import os
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=srv.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{srv.server_address[1]}/'
count=0
def check(cond,label):
 global count
 assert cond,label
 count+=1
 print('PASS',label,flush=True)
try:
 with sync_playwright() as pw:
  browser_path=Path(os.environ.get('JM_CHROMIUM_PATH','')) if os.environ.get('JM_CHROMIUM_PATH') else Path(os.environ.get('LOCALAPPDATA','/nonexistent'))/'ms-playwright'/'chromium-1181'/'chrome-win'/'chrome.exe'
  b=pw.chromium.launch(headless=True,**({'executable_path':str(browser_path)} if browser_path.is_file() else {}))
  for route in ['coding-estate/workshop/openbox/index.html','website/jm-website-001/openbox/index.html']:
   for vp in [{'width':390,'height':844},{'width':840,'height':360},{'width':1280,'height':800}]:
    c=b.new_context(viewport=vp,accept_downloads=True)
    p=c.new_page()
    err=[]
    p.on('pageerror',lambda e:err.append(str(e)))
    p.goto(url+route)
    where=route.split('/')[0]+' '+str(vp['width'])+'x'+str(vp['height'])
    check(p.title().startswith('JM OPENBOX'),where+' correct original door title')
    check(p.locator('#source').count()==1,where+' original code editor found')
    check(p.locator('#jmCheckNow').count()==1,where+' original device-contact check retained')
    check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),where+' no page overflow')
    check(p.evaluate('Math.min(...[...document.querySelectorAll("button")].filter(x=>x.getClientRects().length).map(x=>x.getBoundingClientRect().height))>=43.9'),where+' visible buttons touch 44px')
    p.locator('#name').fill('CP01 synthetic proof')
    p.locator('#source').fill("<!doctype html><html><body><h1 id='cp01proof'>OPENBOX SYNTHETIC SOURCE</h1></body></html>")
    p.locator('#pasteOpen').click()
    p.frame_locator('#previewFrame').locator('#cp01proof').wait_for(timeout=7000)
    check(p.frame_locator('#previewFrame').locator('#cp01proof').inner_text()=='OPENBOX SYNTHETIC SOURCE',where+' original code runs in sandbox')
    with p.expect_download(timeout=7000) as ev:p.locator('#exportHtml').click()
    data=Path(ev.value.path()).read_bytes().decode('utf-8')
    check('OPENBOX SYNTHETIC SOURCE' in data,where+' real independent HTML export includes source')
    check(not err,where+' no JS pageerrors')
    c.close()
  b.close()
finally:srv.shutdown()
print('COMPLETE',count,'assertions')
