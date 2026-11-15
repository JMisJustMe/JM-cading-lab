"""Compile the separate JM OS HOME QA candidate with the owner-recovered Android 36 SDK.
Manual merge is output-only: no production/source manifest rewritten.
"""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,hashlib,json,os,zipfile,shutil,xml.etree.ElementTree as ET
BASE=Path(__file__).resolve().parents[1]
ROOT=Path.home()/"Documents/JM_FOLD_ULTRA_CUSTODY_20261108"
SRC=BASE/"app/src/main"
EXTRA=BASE/"app/src/jmOsHomeQa"
OUT=BASE/"FLAZ/jm-os-home-cp01r3-20261114"
if OUT.exists() and any(OUT.iterdir()):
    raise SystemExit("Existing CP01R3 evidence is immutable: bump version/output path for a new build")
OUT.mkdir(parents=True,exist_ok=True)
PLATFORM=ROOT/"CP13_LOCAL_NATIVE_BUILD_20261108/platforms/android-36/android.jar"
TOOLS=ROOT/"trusted_android_build_tools_36/unpacked/android-16"
JDK=r"C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
PKG="com.jmisjustme.foldultra.jmoshomeqa"
ACT="com.jmisjustme.foldultra.oshome.JMOsHomeActivity"
NS="{http://schemas.android.com/apk/res/android}"
assert hashlib.sha256(PLATFORM.read_bytes()).hexdigest()=="d9eb9da824d9e247a352f570f01e1169e725b2954bca9e283a71786c59b59f9a"
assert "jmOsHomeQa {" in (BASE/"app/build.gradle").read_text(encoding="utf-8")
assert "category.HOME" in (EXTRA/"AndroidManifest.xml").read_text(encoding="utf-8")
assert (EXTRA/"java/com/jmisjustme/foldultra/oshome/JMOsHomeActivity.java").exists()
env={**os.environ,"JAVA_HOME":JDK}
def run(name,args,timeout=130):
    r=subprocess.run([str(x) for x in args],capture_output=True,encoding="utf-8",errors="replace",timeout=timeout,env=env)
    (OUT/(name+".log")).write_text("returncode="+str(r.returncode)+"\nstdout:\n"+r.stdout[-16000:]+"\nstderr:\n"+r.stderr[-16000:],encoding="utf-8")
    print(name,"PASS" if r.returncode==0 else "FAIL",r.stderr[-250:].replace("\n"," "),flush=True)
    if r.returncode:raise RuntimeError(name+" "+r.stderr[-1800:])
    return r
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
original_manifest=SRC/"AndroidManifest.xml"
original_hash=sha(original_manifest)
tree=ET.parse(original_manifest)
root=tree.getroot()
root.set("package",PKG)
# Android 11+ package visibility: three explicit existing JM widget providers only.
queries=root.find("queries")
assert queries is not None
for pkg in ("com.jmisjustme.foldultra.widgetqa",
            "com.jmisjustme.foldultra.widgetv2qa",
            "com.jmisjustme.foldultra.widgetv3qa"):
    ET.SubElement(queries,"package",{NS+"name":pkg})
app=root.find("application")
app.set(NS+"label","JM OS Home · Candidate")
# HOME candidate does not inherit original external entrances/shortcut publication.
for act in app.findall("activity"):
    name=act.get(NS+"name","")
    act.set(NS+"exported","false")
    for filt in list(act.findall("intent-filter")):act.remove(filt)
    for meta in list(act.findall("meta-data")):
        if meta.get(NS+"name")=="android.app.shortcuts":act.remove(meta)
# Widget providers remain in their dedicated original QA packages, not duplicated here.
for receiver in list(app.findall("receiver")):
    if "JMHomeWidget" in receiver.get(NS+"name",""):app.remove(receiver)
home=ET.SubElement(app,"activity",{NS+"name":ACT,NS+"exported":"true"})
for categories in (["android.intent.category.LAUNCHER"],["android.intent.category.HOME","android.intent.category.DEFAULT"]):
    filt=ET.SubElement(home,"intent-filter")
    ET.SubElement(filt,"action",{NS+"name":"android.intent.action.MAIN"})
    for cat in categories:ET.SubElement(filt,"category",{NS+"name":cat})
ET.register_namespace("android","http://schemas.android.com/apk/res/android")
manifest=OUT/"merged_candidate_manifest.xml"
tree.write(manifest,encoding="utf-8",xml_declaration=True)
# Assert source unchanged, exported channels only the new HOME class.
assert sha(original_manifest)==original_hash
assert [(n.get(NS+"name"),n.get(NS+"exported")) for n in app.findall("activity") if n.get(NS+"exported")=="true"]==[(ACT,"true")]
resources=OUT/"resources.zip"
run("01_resources",[TOOLS/"aapt2.exe","compile","--dir",SRC/"res","-o",resources],timeout=110)
linked=OUT/"linked.apk"
gen=OUT/"generated_r_java";gen.mkdir(exist_ok=True)
run("02_link",[TOOLS/"aapt2.exe","link","-o",linked,"-I",PLATFORM,"--manifest",manifest,
               "--java",gen,"--custom-package","com.jmisjustme.foldultra",
               "--min-sdk-version","26","--target-sdk-version","35",
               "--version-code","20","--version-name","1.4.0-JM-OS-HOME-CP01R3",
               "-A",SRC/"assets","--auto-add-overlay","-R",resources],timeout=110)
sources=list((SRC/"java").rglob("*.java"))+list((EXTRA/"java").rglob("*.java"))+list(gen.rglob("*.java"))
assert len(list((EXTRA/"java").rglob("*.java")))==1
lst=OUT/"sources.txt";lst.write_text("\n".join(str(x) for x in sources)+"\n",encoding="utf-8")
classes=OUT/"classes";classes.mkdir(exist_ok=True)
run("03_javac",["javac","-encoding","UTF-8","--release","8","-cp",PLATFORM,"-d",classes,"@"+str(lst)],timeout=180)
jar=OUT/"classes.jar"
run("04_jar",["jar","cf",jar,"-C",classes,"."])
dexdir=OUT/"dex";dexdir.mkdir(exist_ok=True)
run("05_d8",[TOOLS/"d8.bat","--min-api","26","--lib",PLATFORM,"--output",dexdir,jar],timeout=180)
unsigned=OUT/"unsigned.apk"
shutil.copy2(linked,unsigned)
with zipfile.ZipFile(unsigned,"a",compression=zipfile.ZIP_DEFLATED) as z:
    for dex in dexdir.glob("classes*.dex"):z.write(dex,dex.name)
aligned=OUT/"aligned.apk"
run("06_zipalign",[TOOLS/"zipalign.exe","-f","-p","4",unsigned,aligned])
run("07_zipaligncheck",[TOOLS/"zipalign.exe","-c","-p","4",aligned])
keystore=Path.home()/".android/debug.keystore"
if not keystore.exists():
    keystore.parent.mkdir(parents=True,exist_ok=True)
    run("08_generate_qa_debug_key",["keytool","-genkeypair","-keystore",keystore,
         "-storepass","android","-keypass","android","-alias","androiddebugkey",
         "-keyalg","RSA","-keysize","2048","-validity","10000",
         "-dname","CN=JM Local Debug QA,O=JM,C=GB","-noprompt"])
apk=OUT/"JM_OS_HOME_CP01R3_QA.apk"
run("09_sign",[TOOLS/"apksigner.bat","sign","--ks",keystore,
               "--ks-key-alias","androiddebugkey","--ks-pass","pass:android",
               "--key-pass","pass:android","--out",apk,aligned])
run("10_sigverify",[TOOLS/"apksigner.bat","verify","--verbose",apk])
badging=run("11_badging",[TOOLS/"aapt.exe","dump","badging",apk]).stdout
xml=run("12_manifest",[TOOLS/"aapt.exe","dump","xmltree",apk,"AndroidManifest.xml"]).stdout
perms=run("13_permissions",[TOOLS/"aapt.exe","dump","permissions",apk]).stdout
assert "package: name='"+PKG+"'" in badging
assert "android.intent.category.HOME" in xml
assert "android.intent.category.LAUNCHER" in xml
assert "uses-permission:" not in perms
assert "android.intent.action.SEND" not in xml
assert sha(original_manifest)==original_hash
with zipfile.ZipFile(apk) as z:assert z.testzip() is None and "classes.dex" in z.namelist()
report={"schema":"JM.OS.HOME.CP01.NativeAndroidQA/1","utc":datetime.now(timezone.utc).isoformat(),
        "source_project":str(BASE),"branch_expected":"jm/fold-ultra-v14-widget-integration-20261114",
        "package":PKG,"home_activity":ACT,"android_home_declared":True,
        "original_source_manifest_unchanged":True,"android_api":36,"target_sdk":35,
        "java_sources":len(sources),"classfiles":len(list(classes.rglob("*.class"))),
        "permissions_requested":0,"signed":True,"signature_verified":True,"zip_crc_pass":True,
        "apk_path":str(apk),"apk_bytes":apk.stat().st_size,"sha256":sha(apk),
        "installed":False,"android_home_default_unchanged":True,
        "production_signer_used":False,"candidate_debug_key_reusable":True}
(OUT/"CP01_BUILD_RECEIPT.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print("BUILD_RESULT",json.dumps(report,indent=2),flush=True)
