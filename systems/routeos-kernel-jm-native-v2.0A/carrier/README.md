# Source Carrier

This carrier preserves the complete readable v2.0A source tree as two checksum-locked base64 segments because the connected repository write route has bounded single-request payloads.

CI verifies each part, reconstructs the exact base64 body, verifies the compressed tar SHA-256, expands it, then runs the readable source, tests, build, QEMU, visual and packaging routes.

Hashes are recorded in `SOURCE_CARRIER_SHA256.txt`. The decisive source authority remains directly readable at `../source/observatory_continuity.jmroute`.

This is a transport carrier, not independent implementation authority.
