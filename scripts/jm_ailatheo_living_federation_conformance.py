#!/usr/bin/env python3
from pathlib import Path
import re,json,os,tempfile
p=Path('unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html')
s=p.read_text(encoding='utf-8')
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
'truthful_contact':"outcome:'CONTACT_ROUTED_LOCAL',ding:null" in s and "'ROUTED'" in s and 'persistence' in s,
'public_link':'../navigator/estate-integration/bridge.js' in s and 'jm-estate-integration-ready' in s,
'public_hold':'jm-estate-integration-hold' in s,
'route_actions':'data-route' in s and 'JMEstateIntegration?.open' in s,
'diagnostic_subordinate':'Proof / diagnostic mode' in s,
'relationship_law':'CONTACT DOES NOT IMPLY MERGER' in s and 'EARNED MERGE IS PERMITTED' in s,
'ehilatheo_hold':'hold:true' in s,
'reduced_motion':'prefers-reduced-motion' in s,
'visible_faults':'CONTACT HOLD' in s and 'RECOVERY HOLD' in s,
}
assert all(checks.values()),checks
js='\n'.join(re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>',s,re.I|re.S))
output=Path('/tmp/ailatheo-living.js') if os.name!='nt' else Path(tempfile.gettempdir())/'ailatheo-living.js'
output.write_text(js,encoding='utf-8')
print(json.dumps({'schema':'jm.ailatheo.living-federation-conformance/1.0','status':'PASS','checks':checks,'status_scope':'STATIC_CONTRACT_ONLY_NO_DEVICE_DING'},indent=2))
