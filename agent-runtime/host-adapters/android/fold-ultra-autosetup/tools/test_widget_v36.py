from pathlib import Path
import xml.etree.ElementTree as ET
p=Path(__file__).resolve().parents[1]/"app/src/main"
s=(p/"java/com/jmisjustme/foldultra/JMHomeWidget.java").read_text(encoding="utf-8")
assert 'static final String ACTIVATE=' in s
assert 'v.setOnClickPendingIntent(R.id.jm_widget_activate,action(c,provider,ACTIVATE,id,14))' in s
assert 'if(ACTIVATE.equals(a))' in s
assert 'ProjectShelf.choose(c.getSharedPreferences(MainActivity.PREF,Context.MODE_PRIVATE),selected)' in s
assert 'refreshAll(c);' in s
assert 'if(info==null||info.provider==null||!provider.getName().equals(info.provider.getClassName()))return;' in s
for kind in ("compact","expanded"):
    root=ET.parse(p/f"res/layout/jm_home_widget_{kind}.xml").getroot()
    ids=[x.attrib.get("{http://schemas.android.com/apk/res/android}id") for x in root.iter()]
    assert "@+id/jm_widget_activate" in ids
print("PASS v3.6 explicit activation action, provider identity gate and both layouts")
