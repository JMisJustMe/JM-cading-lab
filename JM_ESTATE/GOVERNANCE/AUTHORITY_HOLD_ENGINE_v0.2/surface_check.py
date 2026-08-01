from pathlib import Path
import re,sys
root=Path(__file__).parent
required=['index.html','OPEN_FIRST.html','styles.css','app.mjs','manifest.webmanifest','sw.js','icon.svg','core/engine.mjs']
missing=[x for x in required if not(root/x).exists()]
html=(root/'index.html').read_text();app=(root/'app.mjs').read_text();ids=set(re.findall(r'id="([^"]+)"',html));refs=set(re.findall(r"\$\('([^']+)'\)",app));unknown=sorted(refs-ids)
rooms={'governance','handoff','delegation','replay','trace'}
checks={'missing_files':missing,'unknown_ids':unknown,'rooms_present':rooms<=ids,'mobile_viewport':'width=device-width' in html,'pwa_manifest':'manifest.webmanifest' in html,'module_entry':'type="module"' in html}
print(checks)
sys.exit(0 if not missing and not unknown and all([checks['rooms_present'],checks['mobile_viewport'],checks['pwa_manifest'],checks['module_entry']]) else 1)
