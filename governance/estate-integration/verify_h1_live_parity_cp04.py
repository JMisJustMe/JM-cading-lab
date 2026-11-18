import hashlib,json
from playwright.sync_api import sync_playwright
base="https://jmisjustme.xo.je/"
expected={
"index.html":("28983ccf02a3c7bb50107a8a059bc0ccd0eda0b1356ef93d48ba8203bbb418f1",24710),
"app.js":("563179372b0c4a2c77dc0a8963a28c375b1e823e2b72fa36c909c7d64e88b038",33906),
"DEPLOY_MANIFEST_v1_5.json":("9b4140402839df54881626ed14018001358fc4423c6668a5f26d50bd9e4660a9",21852),
"VERSION.txt":("4c3d339853f267cd4e4024689a7fa5d381514b1c951c0bcad733884238b3f69f",196),
"assets/jm-mark.svg":("5247d09ea19bf716432cf29413719f05d82b3b2c3bdc52f4c0cac6be05269b27",481),
"creations/authority/craftik-v1-9.html":("0927ee35496857a6ba97f1774377c25a17f335dd005e244547b92ee960fe27cb",2473)
}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",headless=True)
    ctx=b.new_context()
    page=ctx.new_page()
    try:
        page.goto(base,wait_until="domcontentloaded",timeout=20000)
        page.wait_for_timeout(1400)
        print("RENDERED_TITLE",json.dumps(page.title(),ensure_ascii=True),"url",page.url)
    except Exception as e:print("ROOT_RENDER_ERROR",str(e)[:140])
    out=[]
    for filename,(expected_sha,expected_size) in expected.items():
        url=base+(filename if filename!="index.html" else "index.html")
        try:
            response=ctx.request.get(url,timeout=16000,max_redirects=4)
            body=response.body()
            sha=hashlib.sha256(body).hexdigest()
            row={"file":filename,"status":response.status,"bytes":len(body),"sha256_equal":sha==expected_sha,"size_equal":len(body)==expected_size,"challenge_observed":b"/aes.js" in body[:4000],"final_url":response.url}
        except Exception as e:
            row={"file":filename,"error_kind":type(e).__name__,"message":str(e)[:120]}
        out.append(row)
        print("ROW",json.dumps(row,ensure_ascii=True))
    b.close()
    print("SUMMARY",json.dumps({"tested":len(out),"exact":sum(x.get("sha256_equal",False) for x in out),"access_challenges":sum(x.get("challenge_observed",False) for x in out)}))
