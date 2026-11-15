from pathlib import Path
p=Path(__file__).resolve().parents[1]/"app/src/main/java/com/jmisjustme/foldultra"
activity=(p/"MainActivity.java").read_text(encoding="utf-8")
widget=(p/"JMHomeWidget.java").read_text(encoding="utf-8")
assert 'sp.registerOnSharedPreferenceChangeListener(widgetShelfListener)' in activity
assert 'sp.unregisterOnSharedPreferenceChangeListener(widgetShelfListener)' in activity
assert '"project.shelf".equals(key)||"project.active".equals(key)' in activity
assert 'JMHomeWidget.refreshAll(this)' in activity
assert 'getAppWidgetIds(new android.content.ComponentName(c,JMHomeWidget.class))' in widget
assert 'getAppWidgetIds(new android.content.ComponentName(c,JMHomeWidgetExpanded.class))' in widget
assert '"OPEN PUBLIC HTTPS LINK"' in widget
print("PASS: v3.4 local project shelf event refresh, both widget providers, accurate link label")
