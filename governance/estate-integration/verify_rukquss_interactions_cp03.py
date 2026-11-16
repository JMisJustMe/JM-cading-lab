from playwright.sync_api import sync_playwright
import json
URL="https://rukquss.com/"
EDGE=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
DISTRICTS=("Play","Build","Think","Create","Publish","Work","Continue")
def visible(page):
    return page.evaluate("""() => {
      const names=['Play','Build','Think','Create','Publish','Work','Continue'];
      return names.filter(name=>[...document.querySelectorAll('a')].some(a => a.textContent.trim().startsWith('Open '+name+' ') && a.getClientRects().length>0));
    }""")
def run(viewport,mobile):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=EDGE,headless=True)
        ctx=b.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.goto(URL,wait_until="domcontentloaded",timeout=25000)
        page.wait_for_timeout(500)
        assert visible(page)==list(DISTRICTS),("initial not seven",visible(page))
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"),"document overflows"
        results=[]
        for query,expected in [("think",["Think"]),("build",["Build"]),("zzzz-unmatch",[]),("",list(DISTRICTS))]:
            page.locator("#find").fill(query)
            page.wait_for_timeout(125)
            found=visible(page)
            results.append({"query":query,"visible":found})
            assert found==expected,("search mismatch",query,found,expected)
        assert not errors,("page error",errors)
        nav=page.locator('a').filter(has_text="Open Think").first
        nav.click(timeout=5000)
        page.wait_for_load_state("domcontentloaded",timeout=20000)
        assert "/theory/" in page.url and "Theory" in page.title(),("navigation failed",page.url,page.title())
        print(json.dumps({"viewport":viewport,"mobile":mobile,"search_cases":results,"click_destination":page.url,"click_title":page.title(),"pageerrors":errors,"result":"PASS"},ensure_ascii=True))
        ctx.close();b.close()
run({"width":390,"height":844},True)
run({"width":1280,"height":900},False)
print("JM RUKQUSS CP03 INTERACTION CHECKS PASS: 2 VIEWPORTS, 8 SEARCH STATES, 2 REAL LINK CLICKS, 0 JS PAGEERROR, 0 HORIZONTAL OVERFLOW")
