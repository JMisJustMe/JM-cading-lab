from playwright.sync_api import sync_playwright
import json
ROOT="https://jmisjustme.github.io/JM-cading-lab/"
ROUTES={
"estate":ROOT,
"access":ROOT+"access/",
"games":ROOT+"games-beyond/",
"everybody":ROOT+"coding-estate/everybody/",
"theory":ROOT+"theory/",
"visual-lab":ROOT+"visual-systems-lab/",
"books":ROOT+"books/",
"career":ROOT+"career/",
"author":ROOT+"author/"
}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",headless=True)
 c=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
 for name,url in ROUTES.items():
  page=c.new_page()
  errors=[]
  page.on("pageerror",lambda e:errors.append(str(e)[:160]))
  try:
   r=page.goto(url,wait_until="domcontentloaded",timeout=17000)
   page.wait_for_timeout(550)
   metrics=page.evaluate("""() => ({title:document.title,view:innerWidth,documentWidth:document.documentElement.scrollWidth,links:document.querySelectorAll('a[href]').length,buttons:document.querySelectorAll('button').length,mainText:(document.querySelector('main')||document.body).innerText.length})""")
   print("RESULT",json.dumps({"id":name,"http":r.status if r else None,"url":page.url,"metrics":metrics,"errors":errors[:4]},ensure_ascii=True),flush=True)
  except Exception as e:
   print("RESULT",json.dumps({"id":name,"url":url,"error_kind":type(e).__name__,"message":str(e)[:140]},ensure_ascii=True),flush=True)
  page.close()
 c.close();b.close()
