#!/usr/bin/env python3
from pathlib import Path
import re, json
P=Path("ai-federation/jm-ai-lab-v2.0/00_OPEN_FIRST_JM_AI_LAB_v2_0_FULL_COMPLETE.html")
s=P.read_text(encoding="utf-8")
checks={
 "identity":"JM AI Lab v2.0 Full Complete Production Body" in s,
 "savepack":"jm-ai-lab-savepack/v2.0" in s,
 "agent_plan":"JM.Agent" in s and "scenarioSuite" in s,
 "knowledge":"JM.Knowledge" in s and "extractiveAnswer" in s,
 "completion":"31/31" not in s or "Completion" in s,
 "production":"JM.Production" in s,
 "trace":"JM.Trace" in s,
 "routeos":"RouteOS" in s,
}
assert all(checks.values()),checks
scripts=re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>",s,re.I)
assert scripts
Path("/tmp/jm_ai_lab_v2_inline.js").write_text("\n".join(scripts),encoding="utf-8")
print(json.dumps({"schema":"jm.ai-lab.mount-proof/0.1","status":"PASS","checks":checks,"script":"/tmp/jm_ai_lab_v2_inline.js","ding":"JM_AI_LAB_V2_EXACT_BODY_MOUNT_DING"},indent=2))
