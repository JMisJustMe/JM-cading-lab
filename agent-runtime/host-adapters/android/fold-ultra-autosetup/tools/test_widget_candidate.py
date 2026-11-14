from pathlib import Path
import xml.etree.ElementTree as ET
base = Path(__file__).resolve().parents[1] / "app/src/main"
ns = "{http://schemas.android.com/apk/res/android}"
manifest = ET.parse(base / "AndroidManifest.xml").getroot()
names = [r.get(ns + "name") for r in manifest.findall(".//receiver")]
assert ".JMHomeWidget" in names and ".JMHomeWidgetExpanded" in names
java = (base / "java/com/jmisjustme/foldultra/JMHomeWidget.java").read_text(encoding="utf-8")
app = (base / "java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
for route in ("galaxy", "continue", "projects", "capture"):
    assert "jmfoldultra://open/" + route in app, route
    assert '"'+route+'"' in java, route
for name in ("compact", "expanded"):
    ET.parse(base / ("res/xml/jm_widget_" + name + ".xml"))
    ET.parse(base / ("res/layout/jm_home_widget_" + name + ".xml"))
print("PASS: widget receivers, layouts, and four original routes")
