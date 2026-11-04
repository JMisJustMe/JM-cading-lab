#!/usr/bin/env python3
"""JM WEBSITE 001: compile user-authored .jmpy source into a browser-readable website carrier.

The `.jmpy` source owns all displayed metric values. This Python adapter cannot
interpret JM.PY itself. It executes the original, verified JM interpreter and
renders its validated output as a static, JavaScript-free HTML page.
"""
from __future__ import annotations
import argparse, hashlib, html, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE = ROOT / "website_proof.jmpy"
METRICS = ROOT / "site_metrics.jmpy"

def compile_site(lang_home: pathlib.Path, root: pathlib.Path = ROOT) -> dict:
    runner = lang_home / "jm.py"
    if not runner.is_file():
        raise RuntimeError("Original JM.PY launcher missing; pass --lang-home. No fallback interpreter allowed.")
    if not all(p.is_file() for p in (SOURCE, METRICS)):
        raise RuntimeError("Missing canonical JM.PY source or imported module.")
    def run(*args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run([sys.executable,str(runner), *args], cwd=lang_home, capture_output=True,text=True,check=True)
    check = run("check",str(SOURCE),"--root",str(root))
    if '"status": "PASS"' not in check.stdout:
        raise RuntimeError("Original JM.PY checker did not accept source")
    output = run("run",str(SOURCE),"--root",str(root)).stdout.strip()
    report = json.loads(output)
    names = report.get("authoring_bodies")
    pages = report.get("sections")
    if not isinstance(names,list) or not all(isinstance(v,str) and v for v in names) or len(names)>10:
        raise RuntimeError("Unsafe authoring bodies output")
    if not isinstance(pages,list) or not all(isinstance(v,str) and v for v in pages) or len(pages)>20:
        raise RuntimeError("Unsafe section output")
    if report.get("body_count") != len(names) or report.get("section_count") != len(pages):
        raise RuntimeError("JM.PY report and dynamic count inconsistent")
    if report.get("language")!="JM.PY 1.0":
        raise RuntimeError("Unexpected original-source-language identity")
    def esc(key:str) -> str:
        v=report.get(key)
        if not isinstance(v,str) or len(v)>300:return ""
        return html.escape(v)
    chips="".join(f'<span class="chip">{html.escape(v)}</span>' for v in names)
    pageitems="".join(f'<li>{html.escape(v)}</li>' for v in pages)
    css='''*{box-sizing:border-box}html{color-scheme:dark}body{background:#06101b;color:#f1f9ff;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:clamp(14px,5vw,60px);display:grid;place-items:center}main{max-width:850px;width:100%;border-radius:27px;padding:clamp(25px,5vw,62px);background:linear-gradient(140deg,#0e2030,#091827);border:1px solid #3c686c;box-shadow:0 18px 55px #0005}h1{font-size:clamp(32px,6vw,65px);line-height:1.07;margin:16px 0 20px;letter-spacing:-.05em}p{color:#c4d6e1;line-height:1.6}.eyebrow{color:#b1f8dd;font-weight:850;letter-spacing:.1em;font-size:13px}.row{display:flex;flex-wrap:wrap;gap:10px}.chip{border:1px solid #4d797e;color:#d6fff0;padding:9px 13px;border-radius:999px;font-size:14px}strong.metric{font-size:clamp(44px,8vw,77px);line-height:1;color:#adf4d8}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:25px 0}.panel{border:1px solid #294655;background:#0b1724;padding:17px;border-radius:17px}.panel p{margin:10px 0 0}ul{padding-left:22px;color:#c4d6e1}li{padding:3px}a{color:#b7ffdb;text-underline-offset:4px}a:focus-visible{outline:3px solid #ffe2a0;outline-offset:3px}.meta{font-size:13px;border-top:1px solid #37545d;padding-top:20px;margin-top:25px}@media(max-width:400px){.stats{grid-template-columns:1fr}main{padding:24px}}'''
    web = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
      '<meta name="viewport" content="width=device-width, initial-scale=1">'
      '<meta name="description" content="Original JM.PY generated build proof for JM WEBSITE 001.">'
      '<title>JM.PY · Original Website Proof</title><style>'+css+'</style></head><body><main>'
      '<span class="eyebrow">JM ECOSTATE · ORIGINAL LANGUAGE PROOF</span>'
      '<h1>'+esc('website')+'<br>Powered by JM.PY</h1>'
      '<p>'+esc('proof')+'. The values below were calculated in independent <code>.jmpy</code> source.</p>'
      '<div class="stats"><div class="panel"><strong class="metric">'+str(report['body_count'])+'</strong><p>Connected authoring bodies</p></div>'
      '<div class="panel"><strong class="metric">'+str(report['section_count'])+'</strong><p>Website sections</p></div></div>'
      '<h2>Authoring languages</h2><div class="row">'+chips+'</div>'
      '<h2>Site sections</h2><ul>'+pageitems+'</ul>'
      '<p class="meta">Source authority: <a href="website_proof.jmpy">website_proof.jmpy</a> + <a href="site_metrics.jmpy">site_metrics.jmpy</a>. '
      'Executed with the original JM.PY interpreter. Browser output is an HTML compatibility carrier; no browser JavaScript is needed on this page.</p>'
      '<p><a href="./">Return to JM WEBSITE 001</a></p></main></body></html>\n')
    out_html=root/'jm-py-proof.html'
    out_json=root/'jm-py-proof.json'
    out_html.write_text(web,encoding="utf-8",newline="\n")
    out_json.write_text(json.dumps(report,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8",newline="\n")
    return {"jm_py_source_sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),"jm_py_module_sha256":hashlib.sha256(METRICS.read_bytes()).hexdigest(),"html_sha256":hashlib.sha256(out_html.read_bytes()).hexdigest(),"json_sha256":hashlib.sha256(out_json.read_bytes()).hexdigest(),"counts":{"bodies":report['body_count'],"sections":report['section_count']}}

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--lang-home",required=True,type=pathlib.Path,help="Original recovered JM_LANGUAGES_v1 directory")
    args=p.parse_args()
    try:
        receipt=compile_site(args.lang_home)
        print(json.dumps({"status":"JM_PY_BUILD_PASS","receipt":receipt},indent=2))
    except (Exception,subprocess.CalledProcessError) as e:
        print(json.dumps({"status":"JM_PY_BUILD_HOLD","detail":str(e)}),file=sys.stderr)
        sys.exit(2)
