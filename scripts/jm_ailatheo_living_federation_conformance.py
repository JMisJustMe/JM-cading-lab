#!/usr/bin/env python3
from pathlib import Path
import re,json
p=Path('unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html')
s=p.read_text()
checks={
'identity':all(x in s for x in ['AILatheo','ROD','JM AI Lab v2.0','Teo OS','Adaptive ECOSTATE','Ehilatheo']),
'living_field':all(x in s for x in ['class="orb"','class="ring r1"','class="meaning"']),
'phone_first':'100dvh' in s and 'safe-area-inset' in s,
'contact':'id="conduct"' in s and "addEventListener('click'" in s,
'state_consequence':"classList.add(v)" in s,
'trace':'TraceBox' in s and 'history.push(rec)' in s,
'persistence':'localStorage.setItem(KEY' in s and 'localStorage.getItem(KEY)' in s,
'recovery':"id=\"recover\"" in s and 'PERSISTED STATE RECOVERED' in s,
'reentry':'RE-ENTRY' in s,
'sha256':"SHA-256" in s and 'payload_sha256' in s,
'return_packet':'AILATHEO_RETURN_PACKET_READY' in s,
'ding':'AILATHEO_LIVING_FEDERATION_DING' in s,
'diagnostic_subordinate':'Proof / diagnostic mode' in s,
'mesh_law':'RELATION ≠ MERGER' in s and 'COMMON ROUTE ≠ COMMON BODY' in s,
'ehilatheo_hold':'hold:true' in s,
'reduced_motion':'prefers-reduced-motion' in s,
'visible_faults':'CONTACT HOLD' in s and 'RECOVERY HOLD' in s,
}
assert all(checks.values()),checks
js='\n'.join(re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>',s,re.I|re.S))
Path('/tmp/ailatheo-living.js').write_text(js)
print(json.dumps({'schema':'jm.ailatheo.living-federation-conformance/1.0','status':'PASS','checks':checks,'ding':'JM_AILATHEO_LIVING_FEDERATION_CONFORMANCE_DING'},indent=2))
