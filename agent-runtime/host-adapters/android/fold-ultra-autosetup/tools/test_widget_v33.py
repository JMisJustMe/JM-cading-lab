from pathlib import Path
import xml.etree.ElementTree as ET
p=Path(__file__).resolve().parents[1]/"app/src/main"
s=(p/"java/com/jmisjustme/foldultra/JMHomeWidget.java").read_text()
assert "ProjectShelf.safeUrl(url)" in s
assert 'return route(c,"projects",request);' in s
assert "Intent.CATEGORY_BROWSABLE" in s
assert 'projectLaunch(c,activeUrl,id*16+5)' in s
assert 'projectLaunch(c,activeUrl,id*16+13)' in s
assert 'activeUrl.isEmpty()?"UNBOUND / Open Shelf":"OPEN PUBLIC HTTPS LINK"' in s
for kind in ("compact","expanded"):
    d=ET.parse(p/f"res/layout/jm_home_widget_{kind}.xml")
    ids=[v.attrib.get("{http://schemas.android.com/apk/res/android}id") for v in d.iter()]
    assert "@+id/jm_widget_link" in ids
print("PASS: v3.3 guarded HTTPS launch, safe unbound fallback and both layouts")
