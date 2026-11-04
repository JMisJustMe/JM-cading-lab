# JM Cloud Contact CP14 — public HTTPS contact without credentials

Original donor pinned: `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810`. Draft ancestor: CP12 PR #582, do not merge/deploy.

CP13 confirmed the original Render service metadata reported `live` but external web `/ready` requests could not be witnessed. CP14 adds a safe independent GitHub-hosted public-side probe. It sends **GET only** to the exact `https://jm-cloud-contact-server-v05.onrender.com` host at `/ready`, `/meta` and `/receipt-key`; refuses redirects, other origins, unexpected versions/schemas, disabled signing, missing profiles, malformed JSON, oversized bodies, key-ID mismatch, non-200 responses. It does not read private content or send credentials; the public ECDSA JWK key-ID check is *self-consistency*, not independent key identity continuity. The original server's readiness result does not attest database durability.

This is strictly an existing-service observation, not a recovery test, migration, DNS switch, traffic change, login, POST, deployment or database operation. Check only the new draft exact-head workflow and independently inspect the real CI log before claiming public HTTPS live contact. If unavailable, preserve HOLD and investigate the public route without weakening any firewall or origin restrictions.

**Operator:** `node agent-runtime/host-adapters/jm-operated-host/public-readiness-contact.mjs`. The CLI does not accept a target override or secret arguments. `node --test agent-runtime/host-adapters/jm-operated-host/public-readiness-contact.test.mjs` tests refusal without contacting production. Both remain owner-editable outside ChatGPT in GitHub.

GroundZeroJM offline and PostgreSQL Render external allowlist empty as of CP14 initial contact; neither route is modified by this work. Earlier CP06–CP12 bounded proofs remain unchanged. Any successful probe must be reported as **PUBLIC HTTPS READINESS ONLY**, not a persisted recovery or operator-host DING.
