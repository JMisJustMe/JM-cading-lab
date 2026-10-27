#!/usr/bin/env python3
"""JM CP05 public-safe read-only source contact. Stdlib; no external tokens."""
import hashlib, json, pathlib, posixpath, re, sys
from urllib.parse import urlsplit
TERM_NAMES = ("Movelinks","Click clickpoints","Holdspots","Flashfinds","Burrowblocks",
              "Lightlifts","Puzzlepicks","Clusterclosers","Storageslips","Blindbinds",
              "Belowblocks","Dark darkdashes","Stucksteps")
REF = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']|\bimport\s+["']([^"']+)["']""",re.I)
def sha(data): return hashlib.sha256(data).hexdigest()
def observe(root, registered):
    root=pathlib.Path(root).resolve(strict=True)
    if len(registered)>64: raise ValueError("HOLD_MAX_REGISTERED")
    manifest=[];links=[];holds=[]
    pathset=set(registered)
    for name in registered:
        if not isinstance(name,str) or not name or name.startswith("/") or "\\" in name or any(x in ("",".","..") for x in name.split("/")): raise ValueError("HOLD_UNSAFE_PATH")
        obj=root/name
        if any(x.is_symlink() for x in [root.joinpath(*name.split("/")[:i]) for i in range(1,len(name.split("/"))+1)]):raise ValueError("HOLD_SYMLINK")
        if not obj.is_file() or not obj.resolve().is_relative_to(root): raise ValueError("HOLD_NOT_REGISTERED_SOURCE")
        data=obj.read_bytes()
        if len(data)>4194304: raise ValueError("HOLD_SIZE")
        manifest.append({"path":name,"size":len(data),"sha256":sha(data)})
        try: text=data.decode("utf-8")
        except UnicodeError:continue
        for match in REF.finditer(text):
            ref=next(x for x in match.groups() if x is not None)
            url=urlsplit(ref)
            if url.scheme or url.netloc or not url.path or url.path.startswith("/"):continue
            dest=posixpath.normpath(posixpath.join(posixpath.dirname(name),url.path))
            if dest.startswith("../") or dest=="..":holds.append({"source":name,"reference":ref,"reason":"ESCAPE"});continue
            if dest in pathset:links.append({"source":name,"target":dest,"offset":match.start()})
            else:holds.append({"source":name,"reference":ref,"reason":"NOT_REGISTERED"})
        if re.search(r"\bimport\s*\(",text):holds.append({"source":name,"reason":"DYNAMIC_IMPORT_REQUIRES_REVIEW"})
    clusters={}
    for item in manifest:clusters.setdefault(item["sha256"],[]).append(item["path"])
    return {"schema":"JM.Guider.PublicContact/0.1","state":"HOLD" if holds else "BOUNDED_CONTACT",
            "registered":manifest,"links":links,"holds":holds,
            "duplicate_clusters":[v for v in clusters.values() if len(v)>1],
            "capability_terms":TERM_NAMES,"mutation_performed":False,
            "authority":"READ_ONLY_PUBLIC_COMPANION"}
if __name__=="__main__":
    if len(sys.argv)!=3:sys.exit("Usage: python contactive_public_probe.py <root> <registered_paths.json>")
    print(json.dumps(observe(sys.argv[1],json.loads(pathlib.Path(sys.argv[2]).read_text())),indent=2))
