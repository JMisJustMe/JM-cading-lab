from pathlib import Path
import xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]/"app/src/main"
src=(root/"java/com/jmisjustme/foldultra/JMHomeWidget.java").read_text()
for key in ("PIN","JUMP","NEXT","PREV","FILTER","REFRESH"):
    assert 'static final String '+key+'=' in src
for token in ('"pin."+id','filtered(all,GROUPS[groupIndex]).length()>0','s.getString("pin."+id','e.remove("group."+id).remove("index."+id).remove("pin."+id)'):
    assert token in src,token
for kind in ("compact","expanded"):
    doc=ET.parse(root/f"res/layout/jm_home_widget_{kind}.xml")
    ids=[x.attrib.get("{http://schemas.android.com/apk/res/android}id") for x in doc.iter()]
    assert "@+id/jm_widget_pin" in ids and "@+id/jm_widget_jump" in ids
print("PASS: v3.2 pin/recall actions, empty-filter skip, widget cleanup and both layouts")
