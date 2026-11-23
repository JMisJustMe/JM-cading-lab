from pathlib import Path
import hashlib,json
p=Path(__file__).resolve().parent.parent
app=p/'app/src/main/java/com/jmisjustme/foldultra'
expected='1a083cb89cf12614eadaeb531628cfba0283949cc178483b44325051eb829e96'
x=app/'JMAppCommonsCapsule.java'
assert hashlib.sha256(x.read_bytes()).hexdigest()==expected,'Inherited CP02.1 Java receiver changed'
manifest=(p/'app/src/main/AndroidManifest.xml').read_text()
assert '<uses-permission' not in manifest,'Unexpected permission'
assert 'com.jmisjustme.appcommons' in (p/'app/build.gradle').read_text(),'App package collided with existing Fold'
assert 'allowBackup="false"' in manifest
assert 'JMOriginalStructures.java' in [a.name for a in app.iterdir()],'Recovered original donor missing'
print(json.dumps({'status':'PASS','inherited_receiver_sha256':expected,'permission':'none declared','separate_app_id':'com.jmisjustme.appcommons'}))
