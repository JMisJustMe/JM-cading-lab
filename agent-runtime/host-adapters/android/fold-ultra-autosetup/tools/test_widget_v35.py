from pathlib import Path
import xml.etree.ElementTree as ET
p=Path(__file__).resolve().parents[1]/"app/src/main"
src=(p/"java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
assert 'onResume(){super.onResume();JMHomeWidget.refreshAll(this);' in src
ns="{http://schemas.android.com/apk/res/android}"
for kind,minheight,cells in [("compact",300,4),("expanded",340,5)]:
    root=ET.parse(p/f"res/xml/jm_widget_{kind}.xml").getroot()
    assert int(root.attrib[ns+"minHeight"].removesuffix("dp"))>=minheight
    assert int(root.attrib[ns+"targetCellHeight"])>=cells
    assert root.attrib[ns+"resizeMode"]=="horizontal|vertical"
print("PASS: v3.5 resume refresh and both widget sizing contracts")
