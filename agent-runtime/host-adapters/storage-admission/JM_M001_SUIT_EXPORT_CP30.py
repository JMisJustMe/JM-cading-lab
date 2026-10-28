#!/usr/bin/env python3
"""JM M001 CP30: lossless SUIT modular build admission, not another renderer.

Verify original source or a deliberate changed edition IN MEMORY, with the
original M001 donor + CP21 preflight. Exact keeper bytes => reuse it. A distinct
candidate => HOLD for owner release role; QA staging requires explicit --qa-only.
No native Library calls, no upload, no implicit owner link release, no quota credit.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

SCHEMA = "JM.M001.SUIT.ExportAdmission/CP30.v1"
MAX_MEMBERS = 50
MAX_BYTES = 20_000_000
SCRIPT = re.compile(rb'<script src="(jm_code/[a-z0-9_]+\.js)"></script>')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_source(archive=None, source_dir=None):
    if (archive is None) == (source_dir is None):
        raise ValueError("SELECT_EXACTLY_ONE_SOURCE")
    if archive is not None:
        p = Path(archive)
        if p.is_symlink() or not p.is_file() or p.stat().st_size > MAX_BYTES:
            raise ValueError("BAD_MODULAR_ARCHIVE")
        with zipfile.ZipFile(p) as z:
            infos = z.infolist()
            if len(infos)>MAX_MEMBERS or len(infos)!=len({v.filename for v in infos}):
                raise ValueError("DUPLICATE_OR_TOO_MANY_MEMBERS")
            if z.testzip() is not None:
                raise ValueError("MODULAR_ARCHIVE_CRC_FAILURE")
            d = {}
            for f in infos:
                pp=PurePosixPath(f.filename)
                if (f.is_dir() or f.filename.startswith('/') or '..' in pp.parts
                    or '\\' in f.filename or f.file_size > MAX_BYTES
                    or ((f.external_attr >> 16) & 0o170000) == 0o120000):
                    raise ValueError("UNSAFE_ARCHIVE_MEMBER")
                d[f.filename] = z.read(f)
            if sum(map(len,d.values()))>MAX_BYTES:
                raise ValueError("MODULAR_EXPANDED_SIZE_REFUSED")
            return d
    if Path(source_dir).is_symlink():raise ValueError("SYMLINK_SOURCE_DIRECTORY_REFUSED")
    root = Path(source_dir).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("SOURCE_DIRECTORY_NOT_FOUND")
    mpath = root / "MANIFEST.json"
    if mpath.is_symlink() or not mpath.is_file():
        raise ValueError("MANIFEST_MISSING")
    manifest=json.loads(mpath.read_text())
    keys = ["MANIFEST.json", "index.html"] + [x["name"] for x in manifest["script_parts"]]
    if len(keys) > MAX_MEMBERS or len(set(keys))!=len(keys):
        raise ValueError("BAD_MANIFEST_MODULE_LIST")
    result={}
    for key in keys:
        p=root/key
        if p.is_symlink() or not p.resolve(strict=True).is_relative_to(root) or not p.is_file():
            raise ValueError("UNSAFE_SOURCE_MODULE")
        b=p.read_bytes()
        if len(b)>MAX_BYTES:raise ValueError("OVERSIZE_SOURCE_MODULE")
        result[key]=b
    if sum(map(len,result.values()))>MAX_BYTES:
        raise ValueError("MODULAR_EXPANDED_SIZE_REFUSED")
    return result


def reconstruct(d, *, mode="baseline"):
    manifest=json.loads(d["MANIFEST.json"])
    if manifest.get("schema")!="JM.SUIT.MODULAR.RECOVERY.v1":
        raise ValueError("NOT_ORIGINAL_SUIT_MODULAR_SCHEMA")
    parts=manifest.get("script_parts")
    if not isinstance(parts,list) or len(parts)!=8:
        raise ValueError("EIGHT_ORIGINAL_MODULES_REQUIRED")
    expected={p["name"] for p in parts}
    if len(expected)!=8 or any(re.fullmatch(r'jm_code/[a-z0-9_]+\.js',p) is None for p in expected):
        raise ValueError("UNSAFE_OR_DUPLICATE_MODULES")
    if any(x not in d for x in expected) or "index.html" not in d:
        raise ValueError("REQUIRED_SOURCE_MISSING")
    if set(SCRIPT.findall(d["index.html"]))!={p.encode() for p in expected}:
        raise ValueError("MODULE_LINKS_NOT_MATCHED")
    if len(SCRIPT.findall(d["index.html"]))!=len(expected):
        raise ValueError("DUPLICATE_SOURCE_SCRIPT_ENTRY")
    for p in parts:
        b=d[p["name"]]
        if len(b)!=p["bytes"] or sha(b)!=p["sha256"]:
            if mode!="changed":
                raise ValueError("BASELINE_MODULE_HASH_CHANGED")
    # Source-side syntax is part of the export gate, not a later visual assumption.
    for name in sorted(expected):
        chk=subprocess.run(["node","--check"],input=d[name],capture_output=True)
        if chk.returncode:
            raise ValueError("JAVASCRIPT_SYNTAX_REFUSED:"+name)
    body=SCRIPT.sub(lambda m:b"<script>"+d[m.group(1).decode()]+b"</script>",d["index.html"])
    exact=sha(body)==manifest["original_html_sha256"] and len(body)==manifest["original_html_bytes"]
    if mode=="baseline" and not exact:
        raise ValueError("BASELINE_RELEASE_IDENTITY_CHANGED")
    if mode=="changed" and exact:
        raise ValueError("UNCHANGED_SOURCE_MISLABELED_CHANGED")
    if mode not in ("baseline","changed"):
        raise ValueError("UNKNOWN_EXPORT_MODE")
    return body,exact


def load_cp21(gate_dir):
    root=Path(gate_dir)
    cp=root/"JM_M001_OUTPUT_ADMISSION_CP21.py"
    if cp.is_symlink() or not cp.is_file():raise ValueError("CP21_GATE_MISSING")
    spec=importlib.util.spec_from_file_location("jm_m001_existing_cp21",cp)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    donor=module.load_donor(root/"JM_M001_Carrier_Admission_Gate_v0_1.py")
    return module,donor


def preflight(source, keeper, gate_dir, *, mode="baseline", qa_output=None):
    if keeper is None:raise ValueError("INDEPENDENT_KEEPER_REQUIRED")
    p=Path(keeper)
    if p.is_symlink() or not p.is_file() or p.stat().st_size>MAX_BYTES:
        raise ValueError("KEEPER_NOT_REGULAR")
    src=read_source(**source)
    body,baseline=reconstruct(src,mode=mode)
    cp21,donor=load_cp21(gate_dir)
    with tempfile.TemporaryDirectory(prefix="jm-suit-m001-cp30-") as tmp:
        candidate=Path(tmp)/"SUIT_CANDIDATE.html"
        candidate.write_bytes(body)
        r=cp21.run(candidate,donor,keeper=p,intended="native_live",direct_link_required=True)
        if r["status"]=="HOLD_INVALID":raise ValueError("CP21_REFUSED_SOURCE")
        if r.get("candidate_sha256")!=sha(body) or r.get("candidate_bytes")!=len(body):
            raise ValueError("CP21_CANDIDATE_MISMATCH")
        if r.get("native_library_write_authorised") is not False or r.get("native_retirement_authorised") is not False:
            raise ValueError("CP21_PERMISSION_ESCALATION")
        reuse=r["keeper_relation"]=="SAME_BYTES_ROLE_HOLD"
        result={"schema":SCHEMA,"mode":mode,"status":"REUSE_EXACT_KEEPER" if reuse else "HOLD_DISTINCT_RELEASE_REQUIRES_OWNER_ROLE",
                "candidate_bytes":len(body),"candidate_sha256":sha(body),"baseline_exact":baseline,
                "keeper_relation":r["keeper_relation"],"native_mutations":0,
                "native_library_write_authorised":False,"native_retirement_authorised":False,
                "quota_savings_claimed_bytes":0,"qa_file_created":False}
        if qa_output is not None:
            # QA scratch ONLY, never production release; refuse overwrites.
            output=Path(qa_output)
            if output.is_symlink() or output.exists() or not output.parent.is_dir():
                raise ValueError("QA_OUTPUT_MUST_BE_NEW")
            with output.open('xb') as f:f.write(body)
            result["qa_file_created"]=True
            result["qa_output_path"]=str(output)
        return result


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    src=ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--archive")
    src.add_argument("--source-dir")
    ap.add_argument("--keeper",required=True)
    ap.add_argument("--gate-dir",default=str(Path(__file__).resolve().parent))
    ap.add_argument("--mode",choices=["baseline","changed"],default="baseline")
    ap.add_argument("--qa-output",help="Explicit local QA only; never a native release")
    a=ap.parse_args(argv)
    try:
        result=preflight({"archive":a.archive,"source_dir":a.source_dir},a.keeper,a.gate_dir,mode=a.mode,qa_output=a.qa_output)
        print(json.dumps(result,sort_keys=True,indent=2))
        return 0 if result["status"]=="REUSE_EXACT_KEEPER" else 1
    except (OSError,ValueError,TypeError,KeyError,zipfile.BadZipFile) as e:
        print(json.dumps({"schema":SCHEMA,"status":"HOLD_INVALID","reason":str(e),"native_mutations":0,"quota_savings_claimed_bytes":0}))
        return 2

if __name__=="__main__":raise SystemExit(main())
