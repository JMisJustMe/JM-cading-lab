"""Read-only JM OS HOME CP01R3 device+source checks; does not steal phone focus."""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,json,hashlib,zipfile
B=Path(__file__).resolve().parents[1]
OUT=B/"FLAZ/jm-os-home-cp01r3-20261114"
APK=OUT/"JM_OS_HOME_CP01R3_QA.apk"
ROOT=Path.home()/"Documents/JM_FOLD_ULTRA_CUSTODY_20261108"
AAPT=ROOT/"trusted_android_build_tools_36/unpacked/android-16/aapt.exe"
def cmd(*args):
    r=subprocess.run([str(a) for a in args],capture_output=True,text=True,encoding="utf-8",errors="replace",timeout=50)
    if r.returncode:raise RuntimeError("COMMAND ERROR "+repr(args)+" "+r.stderr[-500:])
    return r.stdout
checks={}
devices=cmd("adb","devices","-l")
checks["Fold8 ADB contact"]="model:SM_F976B" in devices
def installed(pkg):return "package:" in cmd("adb","shell","pm","path",pkg)
checks["JM OS QA installed"]=installed("com.jmisjustme.foldultra.jmoshomeqa")
checks["original JM Fold Ultra still installed"]=installed("com.jmisjustme.foldultra")
checks["original Home Lab still installed"]=installed("com.jmisjustme.foldultra.homelabqa")
checks["widget v2 still installed"]=installed("com.jmisjustme.foldultra.widgetv2qa")
checks["widget v3 still installed"]=installed("com.jmisjustme.foldultra.widgetv3qa")
home=cmd("adb","shell","cmd","package","resolve-activity","--brief",
         "-a","android.intent.action.MAIN","-c","android.intent.category.HOME")
checks["Samsung HOME still default"]="com.sec.android.app.launcher" in home
pkg=cmd("adb","shell","dumpsys","package","com.jmisjustme.foldultra.jmoshomeqa")
checks["CP01R3 package version"]="versionName=1.4.0-JM-OS-HOME-CP01R3" in pkg
providers=cmd("adb","shell","dumpsys","appwidget")
for version in ("widgetqa","widgetv2qa","widgetv3qa"):
    checks["Android widget provider "+version]=("com.jmisjustme.foldultra."+version+"/com.jmisjustme.foldultra.JMHomeWidget" in providers)
checks["APK SHA matches build receipt"]=hashlib.sha256(APK.read_bytes()).hexdigest()==json.loads((OUT/"CP01_BUILD_RECEIPT.json").read_text(encoding="utf-8"))["sha256"]
with zipfile.ZipFile(APK) as z:checks["APK ZIP integrity"]=z.testzip() is None
manifest=cmd(AAPT,"dump","xmltree",APK,"AndroidManifest.xml")
checks["OS HOME intent"]="android.intent.category.HOME" in manifest
checks["no additional requested permissions"]="uses-permission:" not in cmd(AAPT,"dump","permissions",APK)
result={"schema":"JM.OS.HOME.CP01R3.ReadOnlyDeviceSmoke/1",
        "utc":datetime.now(timezone.utc).isoformat(),"device":"SM-F976B",
        "tests":checks,"pass_count":sum(checks.values()),"test_count":len(checks),
        "modifies_phone":False,"default_home_changed":False,
        "owner_widget_binding":"NOT APPROVED","owner_default_home_choice":"NOT REQUESTED"}
(OUT/"CP01R3_READONLY_SMOKE_RECEIPT.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(json.dumps(result,indent=2),flush=True)
if not all(checks.values()):raise SystemExit(1)
