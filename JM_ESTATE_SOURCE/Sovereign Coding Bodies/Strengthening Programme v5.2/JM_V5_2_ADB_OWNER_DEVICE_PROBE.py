#!/usr/bin/env python3
import argparse, hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile, time

def run(cmd, timeout=30):
    t=time.perf_counter()
    p=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout)
    return {"cmd":cmd,"returncode":p.returncode,"stdout":p.stdout,"stderr":p.stderr,"seconds":round(time.perf_counter()-t,3)}

def adb(*args, timeout=30):
    return run(["adb",*args],timeout=timeout)

def shell(command, timeout=30):
    return adb("shell",command,timeout=timeout)

def prop(name):
    r=shell("getprop "+name)
    return r["stdout"].strip() if r["returncode"]==0 else None

ap=argparse.ArgumentParser(description="JM v5.2 owner-device ADB probe")
ap.add_argument("--write-test",action="store_true",help="Also perform a reversible push/pull hash test in /sdcard/Download")
a=ap.parse_args()

receipt={"schema":"jm.v5.2.adb-owner-device/v1","started_at":time.time(),"state":"HOLD","read_only_default":not a.write_test}
if not shutil.which("adb"):
    receipt["reason"]="ADB_NOT_IN_PATH";print(json.dumps(receipt,indent=2));sys.exit(2)

receipt["adb_version"]=adb("version")
devices=adb("devices","-l")
receipt["devices_raw"]=devices["stdout"]
rows=[x.strip() for x in devices["stdout"].splitlines()[1:] if x.strip()]
authorized=[x for x in rows if "\tdevice" in x or re.search(r"\sdevice(?:\s|$)",x)]
if len(authorized)!=1:
    receipt["reason"]="NEED_EXACTLY_ONE_AUTHORIZED_DEVICE"
    receipt["authorized_count"]=len(authorized)
    print(json.dumps(receipt,indent=2));sys.exit(3)

serial=authorized[0].split()[0]
receipt["device_ref_sha256"]=hashlib.sha256(serial.encode()).hexdigest()
receipt["device_line_redacted"]=authorized[0].replace(serial,"<SERIAL_REDACTED>")
receipt["props"]={
 "manufacturer":prop("ro.product.manufacturer"),
 "model":prop("ro.product.model"),
 "android_release":prop("ro.build.version.release"),
 "sdk":prop("ro.build.version.sdk"),
 "abi_list":prop("ro.product.cpu.abilist"),
 "hardware":prop("ro.hardware"),
 "egl":prop("ro.hardware.egl"),
 "opengles_version_prop":prop("ro.opengles.version"),
}
receipt["developer_settings"]=shell("settings get global development_settings_enabled")
receipt["adb_enabled"]=shell("settings get global adb_enabled")
receipt["wm_size"]=shell("wm size")
receipt["wm_density"]=shell("wm density")
receipt["battery"]=shell("dumpsys battery")
features=shell("pm list features",timeout=45)
receipt["features"]={
 "returncode":features["returncode"],
 "strongbox": "android.hardware.strongbox_keystore" in features["stdout"],
 "vulkan": [x for x in features["stdout"].splitlines() if "vulkan" in x.lower()],
 "opengles": [x for x in features["stdout"].splitlines() if "opengles" in x.lower()],
 "sensor_lines": [x for x in features["stdout"].splitlines() if "sensor" in x.lower()][:80],
}
sf=shell("dumpsys SurfaceFlinger",timeout=45)
receipt["surfaceflinger_gl_lines"]=[x for x in sf["stdout"].splitlines() if any(k in x.lower() for k in ["gles","opengl","vulkan","gpu"])][:80]
sensors=shell("dumpsys sensorservice",timeout=45)
receipt["sensorservice_lines"]=[x for x in sensors["stdout"].splitlines() if any(k in x.lower() for k in ["acceler","gyro","rotation","magnet","vendor"])][:120]

if a.write_test:
    data=b"JM v5.2 phone-laptop contact\n"
    src=pathlib.Path(tempfile.mkdtemp())/"jm_v5_2_contact.txt";src.write_bytes(data)
    remote="/sdcard/Download/JM_v5_2_contact.txt"
    push=adb("push",str(src),remote,timeout=45)
    pull_dest=src.parent/"roundtrip.txt"
    pull=adb("pull",remote,str(pull_dest),timeout=45)
    delete=shell("rm -f "+remote)
    receipt["write_test"]={
      "push":push,"pull":pull,"delete":delete,
      "local_sha256":hashlib.sha256(data).hexdigest(),
      "roundtrip_sha256":hashlib.sha256(pull_dest.read_bytes()).hexdigest() if pull_dest.exists() else None
    }
    receipt["write_test"]["state"]="DING" if receipt["write_test"]["local_sha256"]==receipt["write_test"]["roundtrip_sha256"] else "BUGG"

receipt["state"]="DING"
receipt["finished_at"]=time.time()
out=pathlib.Path("JM_V5_2_ADB_OWNER_DEVICE_RECEIPT.json")
out.write_text(json.dumps(receipt,indent=2),encoding="utf-8")
print(json.dumps(receipt,indent=2))
print("\nSaved:",out.resolve(),file=sys.stderr)