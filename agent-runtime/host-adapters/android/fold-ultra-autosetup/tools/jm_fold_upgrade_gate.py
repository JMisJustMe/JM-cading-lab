#!/usr/bin/env python3
"""JM Fold Ultra — read-only native update compatibility check.

No install, uninstall, data clear, backups, or key retrieval.
Phone mode reads only the installed base APK via Android Debug Bridge, if authorised.
This proof is narrower than actual Android PackageManager acceptance.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

PKG="com.jmisjustme.foldultra"
DIGEST=re.compile(r"Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F:]{64,95})")
BADGE=re.compile(r"package:\s+name='([^']+)'\s+versionCode='(\d+)'")
PERMS=re.compile(r"uses-permission(?:-sdk-23)?: name='([^']+)'")

class Hold(RuntimeError):
    pass

def run(args: list[str], *, timeout: int=45) -> str:
    try:
        done=subprocess.run(args, capture_output=True,text=True,timeout=timeout,check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Hold("Required local Android tool unavailable or timed out: "+str(error)) from error
    if done.returncode!=0:
        # The error may contain the user's device serial: do not print it.
        raise Hold("Android tool refused this read-only check ("+Path(args[0]).name+
                   " exit "+str(done.returncode)+")")
    return done.stdout

def sdk_tool(name: str) -> str:
    env=os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    candidates=[]
    if env:
        tools=Path(env)/"build-tools"
        if tools.is_dir():
            candidates=sorted((p/name for p in tools.iterdir() if p.is_dir()),reverse=True)
    for p in candidates:
        if p.is_file():
            return str(p)
    found=shutil.which(name)
    if found:return found
    raise Hold("Android SDK build-tool "+name+" is required on the trusted laptop")

def inspect(apk: Path,apksigner: str,aapt: str) -> dict:
    if not apk.is_file() or not apk.stat().st_size:
        raise Hold("APK does not exist or is empty")
    sig=run([apksigner,"verify","--verbose","--print-certs",str(apk)])
    match=DIGEST.search(sig)
    if not match:
        raise Hold("Could not verify exactly one expected APK signer digest")
    # Refuse multiple signers rather than assuming which certificate Android trusts.
    if re.search(r"Signer #2 certificate SHA-256 digest:",sig):
        raise Hold("Multiple APK signers require manual verification")
    badging=run([aapt,"dump","badging",str(apk)])
    b=BADGE.search(badging)
    if not b:
        raise Hold("Cannot read Android app ID and versionCode")
    permissions=run([aapt,"dump","permissions",str(apk)])
    return {"package":b.group(1),"version_code":int(b.group(2)),
            "certificate_sha256":match.group(1).replace(":","").lower(),
            "permissions":sorted(set(PERMS.findall(permissions))),
            "apk_sha256":hashlib.sha256(apk.read_bytes()).hexdigest()}

def choose_device(adb: str,serial: str|None) -> str:
    lines=run([adb,"devices"]).splitlines()[1:]
    online=[l.split()[0] for l in lines if len(l.split())>=2 and l.split()[1]=="device"]
    if serial is not None:
        if serial not in online:raise Hold("Requested authorised device not online")
        return serial
    if len(online)!=1:
        raise Hold("Connect/authorise exactly one Android device, or provide --serial")
    return online[0]

def installed_base(adb: str,serial: str,folder: Path) -> Path:
    # We read the app binary, never its saved notes, projects or preference directory.
    paths=run([adb,"-s",serial,"shell","pm","path",PKG]).splitlines()
    paths=[x.strip().split("package:",1)[1] for x in paths if "package:" in x]
    if not paths:
        raise Hold("JM Fold Ultra is not installed on this device")
    base=next((x for x in paths if x.endswith("/base.apk")),None)
    if base is None:raise Hold("Installed base.apk could not be isolated safely")
    target=folder/"installed-base.apk"
    run([adb,"-s",serial,"pull",base,str(target)],timeout=90)
    if not target.is_file():raise Hold("Installed base.apk not pulled")
    return target

def compare(candidate: dict,baseline: dict,device_authoritative: bool) -> dict:
    tests={
       "application_id":candidate["package"]==baseline["package"]==PKG,
       "certificate_sha256_exact":candidate["certificate_sha256"]==baseline["certificate_sha256"],
       "version_code_nondecreasing":candidate["version_code"]>=baseline["version_code"],
       "no_new_permissions":set(candidate["permissions"]).issubset(set(baseline["permissions"])),
    }
    return {
       "status":"PASS_PREINSTALL_READ_ONLY" if all(tests.values()) and device_authoritative else
                ("MATCHES_SUPPLIED_APK_NOT_DEVICE" if all(tests.values()) else "HOLD"),
       "checks":tests,
       "source":"currently installed Android APK" if device_authoritative else "supplied baseline APK only",
       "candidate":{"package":candidate["package"],"version_code":candidate["version_code"],
                    "certificate_sha256":candidate["certificate_sha256"],
                    "sha256":candidate["apk_sha256"],"permissions":candidate["permissions"]},
       "installed_or_baseline":{"package":baseline["package"],"version_code":baseline["version_code"],
                     "certificate_sha256":baseline["certificate_sha256"],
                     "sha256":baseline["apk_sha256"],"permissions":baseline["permissions"]},
       "warning":"This is a read-only preinstall compatibility check, not an installation, "
                 "backup, signature-rotation analysis, or Samsung/Bixby device acceptance."}

def main() -> int:
    p=argparse.ArgumentParser(description="Read-only JM Fold Ultra APK update gate; never modifies phone")
    p.add_argument("--candidate",required=True,type=Path)
    group=p.add_mutually_exclusive_group(required=True)
    group.add_argument("--device",action="store_true",help="compare actual installed APK using authorised ADB")
    group.add_argument("--baseline-apk",type=Path,help="offline APK comparison; not proof of installed version")
    p.add_argument("--serial",help="explicit ADB serial; only with --device")
    args=p.parse_args()
    try:
        if args.serial and not args.device:raise Hold("--serial requires --device")
        signer=sdk_tool("apksigner")
        aapt=sdk_tool("aapt")
        candidate=inspect(args.candidate,signer,aapt)
        if args.device:
            adb=shutil.which("adb")
            if not adb:raise Hold("adb is required on a trusted authorised laptop")
            serial=choose_device(adb,args.serial)
            with tempfile.TemporaryDirectory(prefix="jm-fold-readonly-") as td:
                installed=installed_base(adb,serial,Path(td))
                baseline=inspect(installed,signer,aapt)
        else:
            baseline=inspect(args.baseline_apk,signer,aapt)
        receipt=compare(candidate,baseline,args.device)
        print(json.dumps(receipt,indent=2))
        return 0 if receipt["status"]=="PASS_PREINSTALL_READ_ONLY" else 2
    except Hold as error:
        print(json.dumps({"status":"HOLD","reason":str(error),
            "action":"Do not uninstall, clear data, or force-install any JM APK."},indent=2))
        return 2

if __name__=="__main__":
    sys.exit(main())
