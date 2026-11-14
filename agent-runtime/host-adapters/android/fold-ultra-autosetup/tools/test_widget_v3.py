from pathlib import Path
import xml.etree.ElementTree as ET
base=Path(__file__).resolve().parents[1]/"app/src/main"
src=(base/"java/com/jmisjustme/foldultra/JMHomeWidget.java").read_text(encoding="utf-8")
shelf=(base/"java/com/jmisjustme/foldultra/ProjectShelf.java").read_text(encoding="utf-8")
assert "ProjectShelf.all" in src and "project.shelf" in shelf
assert "getSharedPreferences(MainActivity.PREF" in src
for action in ("NEXT","PREV","FILTER","REFRESH"):
    assert 'static final String '+action+'=' in src
assert "Math.floorMod" in src and "getAppWidgetInfo(id)" in src
assert "info.provider.getClassName()" in src
assert "MODE_PRIVATE" in src
for kind in ("compact","expanded"):
    root=ET.parse(base/("res/layout/jm_home_widget_"+kind+".xml")).getroot()
    ids=[n.attrib.get("{http://schemas.android.com/apk/res/android}id","") for n in root.iter()]
    for name in ("selected","subtitle","count","filter","next","prev","refresh","continue","open"):
        assert "@+id/jm_widget_"+name in ids,(kind,name)
print("PASS: v3 source-backed shelf, independent state, filtered controls, both layouts")
