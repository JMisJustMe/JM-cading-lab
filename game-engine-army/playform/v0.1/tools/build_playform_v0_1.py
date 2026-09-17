#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil
from pathlib import Path
PARTS=[f'app.part{i}.txt' for i in range(1,4)]
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def build(source:Path,out:Path)->dict:
 source=source.resolve();out=out.resolve();out.mkdir(parents=True,exist_ok=True)
 index=(source/'index.html').read_text();css=(source/'style.css').read_text();js=''.join((source/p).read_text() for p in PARTS)
 single=index.replace('<link rel="stylesheet" href="style.css">',f'<style>\n{css}\n</style>').replace('<script src="app-loader.js"></script>',f'<script>\n{js}\n</script>')
 target=out/'OPEN_FIRST_PLAYFORM_SOVEREIGN_REBUILD_v0_1.html';target.write_text(single)
 for n in ['index.html','style.css','app-loader.js',*PARTS,'README.md','SOURCE_LINEAGE_AND_BUILD_MANIFEST.json']:shutil.copy2(source/n,out/n)
 (out/'app.js').write_text(js);m=json.loads((source/'SOURCE_LINEAGE_AND_BUILD_MANIFEST.json').read_text())
 r={'schema':'jm.playform-build-receipt/0.1','status':'PLAYFORM_SOVEREIGN_REBUILD_STATIC_BUILD_PASS_BROWSER_CONTACT_OPEN','source_part_count':len(PARTS),'javascript_sha256':sha(js.encode()),'single_file':target.name,'single_file_sha256':sha(target.read_bytes()),'component_count':len(m['components']),'coding_body_count':len(m['codingBodies']),'donor_count':len(m['donors']),'claim_boundary':m['claimBoundary']};r['receipt_sha256']=sha(json.dumps(r,sort_keys=True,separators=(',',':')).encode());(out/'BUILD_RECEIPT.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n');return r
def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]);p.add_argument('--out',type=Path,required=True);a=p.parse_args();print(json.dumps(build(a.source,a.out),sort_keys=True))
if __name__=='__main__':main()
