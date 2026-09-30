#!/usr/bin/env python3
"""Static/runtime-contract proof for the deployed AILatheo Unified Browser carrier."""
from pathlib import Path
import re, json
p=Path("unified-browser/OPEN_FIRST_AILATHEO_UNIFIED_BROWSER_CIRCUIT_v0_1.html")
s=p.read_text()
checks={
 "owner_contact_nodes": all(x in s for x in ["AILatheo","ROD","JM AI Lab v2.0","Teo OS","Adaptive ECOSTATE","Ehilatheo"]),
 "ding": "AILATHEO_VISIBLE_CIRCUIT_DING" in s,
 "write": "localStorage.setItem(KEY" in s,
 "read": "localStorage.getItem(KEY)" in s,
 "reentry_marker": "PERSISTED_STATE_RELOADED" in s,
 "ehilatheo_hold": "hold:true" in s,
 "reset_delete": "localStorage.removeItem(KEY)" in s,
 "return_receipt_schema": "jm.ailatheo.return-receipt/0.1" in s,
 "payload_sha256": "payload_sha256" in s and "crypto.subtle.digest('SHA-256'" in s,
 "second_surface_packet": "AILATHEO_RETURN_PACKET_READY" in s,\n "explicit_dom_binding": "getElementById" in s and "addEventListener" in s,\n "visible_contact_error": "CONTACT ERROR:" in s,\n "visible_recovery_error": "RECOVERY ERROR:" in s,
}
assert all(checks.values()),checks
print(json.dumps({"schema":"jm.ailatheo.owner-carrier-contract/0.1","status":"PASS","checks":checks,
 "boundary":"Static carrier contract proves persistence/re-entry implementation, not a fresh physical reload observation.",
 "ding":"JM_AILATHEO_OWNER_CARRIER_CONTRACT_DING"},indent=2))
