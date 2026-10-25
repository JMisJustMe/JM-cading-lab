#!/usr/bin/env python3
from __future__ import annotations
import argparse, contextlib, hashlib, http.server, json, os, pathlib, re, shutil, socket, subprocess, sys, threading, time, webbrowser

HERE=pathlib.Path(__file__).resolve().parent
BROWSER=HERE/"browser"/"00_OPEN_FIRST_JM_V5_2_OWNER_PHONE_GRAND_CONTACT_SUITE.html"
RECEIPTS=HERE/"receipts"
BROWSER_RECEIPT="/sdcard/Download/JM_V5_2_OWNER_PHONE_GRAND_CONTACT_RECEIPT.json"
NATIVE_PKG="com.jm.v61probe"
NATIVE_ACTIVITY=NATIVE_PKG+"/.MainActivity"
NATIVE_INTERNAL="files/JM_V6_1_ANDROID_NATIVE_RECEIPT.json"

def run(cmd,timeout=45,cwd=None):
    t=time.perf_counter()
    p=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=timeout)
    return {"cmd":cmd,"returncode":p.returncode,"stdout":p.stdout,"stderr":p.stderr,"seconds":round(time.perf_counter()-t,3)}

def find_adb():
    p=shutil.which("adb")
    if p:return p
    candidates=[]
    for root in [os.getenv("ANDROID_HOME"),os.getenv("ANDROID_SDK_ROOT"),os.getenv("LOCALAPPDATA")]:
        if root:
            root=pathlib.Path(root)
            candidates += [root/"platform-tools"/"adb.exe", root/"Android"/"Sdk"/"platform-tools"/"adb.exe"]
    return str(next((p for p in candidates if p.exists()),""))

def adb(adb_path,*args,timeout=45):
    return run([adb_path,*args],timeout=timeout)

def one_device(adb_path):
    r=adb(adb_path,"devices","-l")
    rows=[x.strip() for x in r["stdout"].splitlines()[1:] if x.strip()]
    auth=[x for x in rows if "\tdevice" in x or re.search(r"\sdevice(?:\s|$)",x)]
    return r,auth

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass

def serve_browser():
    sock=socket.socket();sock.bind(("127.0.0.1",0));port=sock.getsockname()[1];sock.close()
    handler=lambda *a,**kw: Quiet(*a,directory=str(BROWSER.parent),**kw)
    srv=http.server.ThreadingHTTPServer(("127.0.0.1",port),handler)
    th=threading.Thread(target=srv.serve_forever,daemon=True);th.start()
    return srv,port

def shell(adb_path,command,timeout=45):
    return adb(adb_path,"shell",command,timeout=timeout)

def collect_read_only(adb_path,device_line):
    def prop(n): return shell(adb_path,"getprop "+n)["stdout"].strip()
    receipt={
      "schema":"jm.v6.1.adb-contact/v1","state":"DING","read_only":True,
      "device_line_redacted":re.sub(r"^\S+","<SERIAL_REDACTED>",device_line),
      "device_ref_sha256":hashlib.sha256(device_line.split()[0].encode()).hexdigest(),
      "props":{
        "manufacturer":prop("ro.product.manufacturer"),"model":prop("ro.product.model"),
        "android_release":prop("ro.build.version.release"),"sdk":prop("ro.build.version.sdk"),
        "abi_list":prop("ro.product.cpu.abilist"),"hardware":prop("ro.hardware")
      },
      "developer_settings":shell(adb_path,"settings get global development_settings_enabled")["stdout"].strip(),
      "adb_enabled":shell(adb_path,"settings get global adb_enabled")["stdout"].strip(),
      "wm_size":shell(adb_path,"wm size")["stdout"].strip(),
      "wm_density":shell(adb_path,"wm density")["stdout"].strip(),
    }
    feat=shell(adb_path,"pm list features",timeout=60)
    receipt["features"]={
      "strongbox":"android.hardware.strongbox_keystore" in feat["stdout"],
      "vulkan":[x for x in feat["stdout"].splitlines() if "vulkan" in x.lower()],
      "sensor_lines":[x for x in feat["stdout"].splitlines() if "sensor" in x.lower()][:100]
    }
    return receipt

def reversible_transfer(adb_path):
    local=RECEIPTS/"JM_V6_1_CONTACT_TOKEN.txt";local.write_text("JM v6.1 owner-device reversible contact\n",encoding="utf-8")
    remote="/sdcard/Download/JM_V6_1_CONTACT_TOKEN.txt"
    push=adb(adb_path,"push",str(local),remote,timeout=45)
    pulled=RECEIPTS/"JM_V6_1_CONTACT_TOKEN_RETURN.txt"
    pull=adb(adb_path,"pull",remote,str(pulled),timeout=45)
    delete=shell(adb_path,"rm -f "+remote)
    a=hashlib.sha256(local.read_bytes()).hexdigest()
    b=hashlib.sha256(pulled.read_bytes()).hexdigest() if pulled.exists() else None
    return {"state":"DING" if a==b else "BUGG","local_sha256":a,"roundtrip_sha256":b,"push_returncode":push["returncode"],"pull_returncode":pull["returncode"],"delete_returncode":delete["returncode"]}

def poll_pull(adb_path,remote,local,seconds=360):
    end=time.time()+seconds
    while time.time()<end:
        test=shell(adb_path,"test -f "+remote+" && echo FOUND || true",timeout=10)
        if "FOUND" in test["stdout"]:
            r=adb(adb_path,"pull",remote,str(local),timeout=45)
            if r["returncode"]==0 and local.exists():return True
        time.sleep(2)
    return False

def native_apk():
    return HERE/"android_native"/"app"/"build"/"outputs"/"apk"/"debug"/"app-debug.apk"

def try_build_native():
    apk=native_apk()
    if apk.exists():return {"state":"DING","apk":str(apk),"route":"already-built"}
    gradle=shutil.which("gradle")
    if not gradle:return {"state":"HOLD","reason":"Gradle not found. Open android_native project in Android Studio and build app-debug.apk."}
    r=run([gradle,":app:assembleDebug"],cwd=HERE/"android_native",timeout=300)
    return {"state":"DING" if apk.exists() and r["returncode"]==0 else "HOLD","apk":str(apk) if apk.exists() else None,"returncode":r["returncode"],"stderr":r["stderr"][-1500:]}

def pull_native_receipt(adb_path):
    out=RECEIPTS/"JM_V6_1_ANDROID_NATIVE_RECEIPT.json"
    r=adb(adb_path,"exec-out","run-as",NATIVE_PKG,"cat",NATIVE_INTERNAL,timeout=30)
    if r["returncode"]==0 and r["stdout"].strip().startswith("{"):
        out.write_text(r["stdout"],encoding="utf-8");return True
    return False

def self_test():
    checks=[
      ("browser_exists",BROWSER.exists()),
      ("classifier_exists",(HERE/"JM_V6_1_RECEIPT_CLASSIFIER.py").exists()),
      ("native_manifest",(HERE/"android_native/app/src/main/AndroidManifest.xml").exists()),
      ("native_source",(HERE/"android_native/app/src/main/java/com/jm/v61probe/MainActivity.kt").exists()),
      ("receipts_dir",RECEIPTS.exists()),
    ]
    return {"state":"DING" if all(v for _,v in checks) else "BUGG","tests":len(checks),"passed":sum(v for _,v in checks),"details":checks}

def main():
    ap=argparse.ArgumentParser(description="JM v6.1 external-contact orchestrator")
    ap.add_argument("--write-test",action="store_true",help="Run reversible ADB push/pull/hash/delete")
    ap.add_argument("--native",action="store_true",help="Try build/install/run Android native probe")
    ap.add_argument("--self-test",action="store_true")
    a=ap.parse_args()
    RECEIPTS.mkdir(exist_ok=True)
    if a.self_test:
        print(json.dumps(self_test(),indent=2));return 0

    adb_path=find_adb()
    if not adb_path:
        print(json.dumps({"state":"HOLD","reason":"ADB_NOT_FOUND","next":"Install Android platform-tools or use Android Studio SDK Platform-Tools."},indent=2));return 2
    adb(adb_path,"start-server")
    raw,auth=one_device(adb_path)
    if len(auth)!=1:
        print(json.dumps({"state":"HOLD","reason":"NEED_EXACTLY_ONE_AUTHORIZED_DEVICE","devices":raw["stdout"]},indent=2));return 3

    device=auth[0]
    receipt=collect_read_only(adb_path,device)
    if a.write_test:receipt["write_test"]=reversible_transfer(adb_path)
    adb_receipt=RECEIPTS/"JM_V6_1_ADB_OWNER_DEVICE_RECEIPT.json"
    adb_receipt.write_text(json.dumps(receipt,indent=2),encoding="utf-8")

    srv,port=serve_browser()
    try:
        adb(adb_path,"reverse",f"tcp:{port}",f"tcp:{port}")
        url=f"http://127.0.0.1:{port}/{BROWSER.name}"
        adb(adb_path,"shell","am","start","-a","android.intent.action.VIEW","-d",url)
        print("\nJM v6.1: browser suite launched on the connected phone.")
        print("Run it, FINALIZE, then SAVE MASTER RECEIPT JSON. I will watch Downloads for up to 6 minutes.\n")
        browser_local=RECEIPTS/"JM_V5_2_OWNER_PHONE_GRAND_CONTACT_RECEIPT.json"
        got_browser=poll_pull(adb_path,BROWSER_RECEIPT,browser_local,360)
    finally:
        with contextlib.suppress(Exception):adb(adb_path,"reverse","--remove",f"tcp:{port}")
        srv.shutdown()

    native_state={"state":"SKIPPED"}
    got_native=False
    if a.native:
        native_state=try_build_native()
        apk=native_apk()
        if native_state["state"]=="DING" and apk.exists():
            inst=adb(adb_path,"install","-r",str(apk),timeout=120)
            if inst["returncode"]==0:
                adb(adb_path,"shell","am","start","-n",NATIVE_ACTIVITY)
                print("\nNative probe launched. Tap RUN NATIVE CONTACT, move the phone for 5 seconds, then tap SAVE INTERNAL RECEIPT.")
                end=time.time()+300
                while time.time()<end:
                    if pull_native_receipt(adb_path):got_native=True;break
                    time.sleep(2)
            else:native_state={"state":"HOLD","reason":"APK install failed","stderr":inst["stderr"][-1200:]}

    files=[str(adb_receipt)]
    if got_browser:files.append(str(browser_local))
    if got_native:files.append(str(RECEIPTS/"JM_V6_1_ANDROID_NATIVE_RECEIPT.json"))
    out=RECEIPTS/"JM_V6_1_MASTER_CONTACT_RECEIPT.json"
    c=run([sys.executable,str(HERE/"JM_V6_1_RECEIPT_CLASSIFIER.py"),*files,"--out",str(out)],timeout=30)
    summary={
      "schema":"jm.v6.1.orchestrator-run/v1",
      "state":"DING" if adb_receipt.exists() else "HOLD",
      "adb_receipt":str(adb_receipt),
      "browser_receipt_collected":got_browser,
      "native_receipt_collected":got_native,
      "native_build":native_state,
      "master_receipt":str(out) if out.exists() else None,
      "classifier_returncode":c["returncode"]
    }
    (RECEIPTS/"JM_V6_1_ORCHESTRATOR_RUN_RECEIPT.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print("\n"+json.dumps(summary,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())