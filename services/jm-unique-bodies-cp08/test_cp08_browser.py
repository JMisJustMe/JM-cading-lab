import asyncio,json,os,socket,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parent
TOKEN='cp08.browser.test.secret.0123456789'
async def main():
 with tempfile.TemporaryDirectory() as tmp:
  with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
  origin=f'http://127.0.0.1:{port}'
  env=os.environ.copy();env.update({'JM_BODIES_TOKEN':TOKEN,'CP08_PUBLIC_ORIGIN':origin})
  proc=subprocess.Popen([sys.executable,str(BASE/'cp08_gateway.py'),'--port',str(port),'--db',tmp+'/atlas.sqlite3'],cwd=BASE,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  try:
   for _ in range(60):
    try:
     with urllib.request.urlopen(origin+'/health',timeout=2) as r:
      if json.load(r)['ok']:break
    except:await asyncio.sleep(.08)
   else:raise RuntimeError('server start HOLD')
   out=[]
   async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,700):
     page=await browser.new_page(viewport={'width':width,'height':852},accept_downloads=True)
     errors=[];requests=[]
     page.on('pageerror',lambda e:errors.append(str(e)))
     page.on('request',lambda r:requests.append({'url':r.url,'method':r.method}) if r.method=='POST' else None)
     await page.goto(origin+'/fold')
     await page.locator('#secret').fill(TOKEN)
     await page.locator('#connect').click()
     await page.wait_for_function("document.querySelector('#status').textContent.includes('LIVE MCP VERIFIED')",timeout=25000)
     if width==390:
      await page.locator('#thirtytwo').click()
      await page.wait_for_function("document.querySelector('#status').textContent.includes('MCP PERSISTENCE PASS')",timeout=90000)
      assert await page.locator('#events').inner_text()=='64'
      await page.locator('#replay').click()
      await page.wait_for_function("document.querySelector('#status').textContent.includes('EXACT REPLAY PASS')",timeout=15000)
     else:
      await page.locator('#both').click()
      await page.wait_for_function("document.querySelector('#status').textContent.includes('MCP PERSISTENCE PASS')",timeout=25000)
      assert await page.locator('#events').inner_text()=='66'
     assert not errors,errors
     assert not any(x['url'].startswith('file:') for x in requests)
     assert len(requests)>= (35 if width==390 else 3),requests
     path=BASE.parent/f'CP08_DIRECT_HTTP_BROWSER_{width}.png'
     await page.screenshot(path=str(path),full_page=True)
     out.append({'viewport_width':width,'post_count':len(requests),'browser_errors':errors,'persisted_event_count':await page.locator('#events').inner_text(),'network_type':'direct_fetch_no_browser_shim','screenshot':str(path)})
     await page.close()
    await browser.close()
   print(json.dumps({'result':'PASS','test':'real_local_browser_http_transport','results':out,'owner_physical_fold':'HOLD','remote_https':'HOLD'},indent=2))
  finally:
   proc.terminate()
   try:proc.wait(timeout=4)
   except subprocess.TimeoutExpired:proc.kill()
if __name__=='__main__':asyncio.run(main())
