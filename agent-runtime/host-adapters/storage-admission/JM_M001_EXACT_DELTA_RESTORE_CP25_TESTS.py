#!/usr/bin/env python3
"""CP25 synthetic exact-version recovery and fail-closed regression."""
import hashlib, importlib.util, json, shutil, subprocess, tempfile, zipfile
from pathlib import Path

source=Path(__file__).with_name("JM_M001_EXACT_DELTA_RESTORE_CP25.py")
spec=importlib.util.spec_from_file_location("jm_m001_cp25",source)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
checks={}
def t(name, ok):
    checks[name]=bool(ok)
    if not ok: raise AssertionError(name)
def held(name, fn):
    try: fn()
    except (ValueError, OSError, KeyError, zipfile.BadZipFile): t(name, True)
    else: t(name, False)

if not shutil.which("zstd"):
    raise SystemExit("CP25 TEST FAIL: zstd unavailable")
with tempfile.TemporaryDirectory() as td:
    d=Path(td)
    base=d/"base.zip"; later=d/"later.zip"; patch=d/"change.zstpatch"
    with zipfile.ZipFile(base,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr("one.html", "JM BUILD "*100000+"early")
        z.writestr("details.json", '{"version":1}')
    with zipfile.ZipFile(later,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr("one.html", "JM BUILD "*100000+"later")
        z.writestr("details.json", '{"version":2}')
    proc=subprocess.run(["zstd","-q","--patch-from",str(base),str(later),"-o",str(patch)],capture_output=True)
    t("synthetic_delta_created",proc.returncode==0 and patch.is_file())
    info=lambda p: {"bytes":p.stat().st_size,"sha256":m.digest(p)}
    meta={"schema":m.SCHEMA,"gate":{"retirement_authorised":False},
          "base":info(base),"target":{**info(later),"zip_members":2},"delta":info(patch)}
    manifest=d/"receipt.json";manifest.write_text(json.dumps(meta))
    output=d/"new.zip"
    result=m.restore(manifest,base,patch,output)
    t("exact_zip_restore",result["status"]=="RESTORE_EXACT_PASS" and output.read_bytes()==later.read_bytes())
    t("sha_kept",result["sha256"]==info(later)["sha256"])
    t("no_native_mutations",result["native_mutations"]==0)
    t("no_false_quota",result["quota_savings_claimed_bytes"]==0)
    held("refuse_output_overwrite",lambda:m.restore(manifest,base,patch,output))
    bad=d/"bad.patch";bad.write_bytes(patch.read_bytes()[:-1])
    held("refuse_corrupt_patch",lambda:m.restore(manifest,base,bad,d/"badout.zip"))
    wrong={**meta,"gate":{"retirement_authorised":True}}
    unsafe=d/"unsafe.json";unsafe.write_text(json.dumps(wrong))
    held("refuse_forged_retire_authority",lambda:m.restore(unsafe,base,patch,d/"unsafeout.zip"))
    wrong={**meta,"target":{**meta["target"],"sha256":"0"*64}}
    false=d/"false.json";false.write_text(json.dumps(wrong))
    held("refuse_target_mismatch",lambda:m.restore(false,base,patch,d/"falseout.zip"))
    held("refuse_missing_base",lambda:m.restore(manifest,d/"missing.zip",patch,d/"lost.zip"))
    symlink=d/"link.patch";symlink.symlink_to(patch)
    held("refuse_symlink_patch",lambda:m.restore(manifest,base,symlink,d/"linked.zip"))
print(json.dumps({"schema":"JM.M001.CP25.Tests/1","pass":all(checks.values()),
                  "checks":len(checks),"cases":checks},sort_keys=True,indent=2))
if not all(checks.values()):raise SystemExit(2)
