#!/usr/bin/env python3
"""Static owner-carrier contract for the current AILatheo Teaching Field."""
from pathlib import Path
import json
p=Path("unified-browser/OPEN_FIRST_AILATHEO_TEACHING_FIELD_v1_1.html")
s=p.read_text()
checks={
 "ailatheo_identity":"<b>AILatheo</b>" in s,
 "teaching_models":all(x in s for x in ["LIGHT_ON","SHAPE_CHANGE","CAUSE_CONTACT"]),
 "ding":"DING" in s,
 "write":"localStorage.setItem(KEY" in s,
 "read":"localStorage.getItem(KEY)" in s,
 "reentry_marker":"PERSISTED_STATE_RELOADED" in s,
 "recovery":all(x in s for x in ["RECOVERY_PASS","RECOVERY_BASELINE"]),
 "return_receipt_schema":"jm.ailatheo.return-receipt/0.1" in s,
 "payload_sha256":"payload_sha256" in s and "crypto.subtle.digest('SHA-256'" in s,
 "second_surface_packet":"AILATHEO_RETURN_PACKET_READY" in s,
 "explicit_dom_binding":"getElementById" in s and "addEventListener" in s,
 "touch_first_law":"TOUCH FIRST · VISIBLE CONSEQUENCE · LANGUAGE AFTER DING" in s,
}
bad=[k for k,v in checks.items() if not v]
assert not bad,{"failed":bad,"checks":checks}
print(json.dumps({"schema":"jm.ailatheo.owner-carrier-contract/1.1","status":"PASS","checks":checks,
 "boundary":"Static carrier contract plus paired host/browser proofs. It does not claim fresh physical owner-device reload or second-surface return.",
 "ding":"JM_AILATHEO_OWNER_CARRIER_CONTRACT_DING"},indent=2))
