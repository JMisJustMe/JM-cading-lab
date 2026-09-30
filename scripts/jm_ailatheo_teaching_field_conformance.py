#!/usr/bin/env python3
from pathlib import Path
import re,json
p=Path("unified-browser/OPEN_FIRST_AILATHEO_TEACHING_FIELD_v1_1.html")
s=p.read_text()
checks={
 "viewport_fit":"viewport-fit=cover" in s,
 "safe_area":"safe-area-inset-bottom" in s and "safe-area-inset-top" in s,
 "visual_viewport":"visualViewport" in s,
 "protected_field":"min-height:300px" in s,
 "android_mobile_first":"@media(min-width:800px)" in s,
 "no_horizontal_overflow":"overflow-x:hidden" in s,
 "touch_floor":"min-height:44px" in s,
 "reduced_motion":"prefers-reduced-motion" in s,
 "light_model":all(x in s for x in ["TURN ON THE LAMP","LIGHT_ON","lamp.turnOn"]),
 "shape_model":all(x in s for x in ["CHANGE THE SHAPE","SHAPE_CHANGE","shape.next"]),
 "cause_model":all(x in s for x in ["MOVE THE BALL","CAUSE_CONTACT","ball.moveTo(dog)"]),
 "touch_first_law":"TOUCH FIRST · VISIBLE CONSEQUENCE · LANGUAGE AFTER DING" in s,
 "visible_consequence":all(x in s for x in ["meaning(","ding(","STATE_CHANGE"]),
 "trace":all(x in s for x in ["TRACE_OPEN","renderTrace","app.trace"]),
 "recovery":all(x in s for x in ["RECOVERY_PASS","RECOVERY_BASELINE","lastSafe"]),
 "persistence":all(x in s for x in ["localStorage.setItem","localStorage.getItem","PERSISTED_STATE_RELOADED"]),
 "explicit_dom":"getElementById" in s and "addEventListener" in s,
 "no_network":not any(x in s for x in ["fetch(","XMLHttpRequest","https://","http://"]),
 "ailatheo_persona":"<b>AILatheo</b>" in s,
 "federation_not_furniture":not all(x in s for x in ["ROD","JM AI Lab v2.0","Teo OS","Adaptive ECOSTATE","Ehilatheo"])
}
bad=[k for k,v in checks.items() if not v]
receipt={"schema":"jm.ailatheo.teaching-field-conformance/1.1","status":"PASS" if not bad else "FAIL","checks":checks,"failed":bad,"boundary":"Static/source conformance plus JS syntax when paired with node --check. Does not claim browser viewport, owner-device feel, live deployment or owner crown.","ding":"JM_AILATHEO_TEACHING_FIELD_STATIC_DING" if not bad else None}
print(json.dumps(receipt,indent=2))
raise SystemExit(1 if bad else 0)
