# JM Cloud Contact CP15 — LIVE five-organ contact and signer-continuity HOLD

**Date:** 2026-10-28. **Evidence scope:** public, GET-only, no-auth contact of the authentic hosted v0.5.1 Cloud Contact, Game, Mesh, Market and Zezu organs. This document does NOT certify durable owner-side custody or live restoration.

## Exact source and independent proof

- Source commit: `20391acf7687e1af9b732328167e00fad5c39870`, draft PR #599 on original CP14 draft, unmerged.
- Pinned source donor: `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810`. Render deployment metadata attests this commit; HTTP itself does not.
- CI exact-head 11/11 SUCCESS; CP14 regression 6/6, CP15 adversarial suite 6/6 PASS.
- Genuine GitHub runner: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40747380339/job/123024658644
- Real public 10/10 organ GET route responses, recorded 2026-10-28 18:41:23 UTC, with CP14 `/ready`, `/meta`, `/receipt-key` independently re-contacted first.
- Scope: `PUBLIC_READ_ONLY_FIVE_ORGAN_CONTACT_NOT_STATE_RECOVERY`; no account-bearing endpoints, private data, authentication, market quote feeds, writes, deployment, DNS or permission changes.

| Sovereign organ | Genuine public response |
|---|---|
| Cloud Contact v0.5.1 | CP14 ready true; public ECDSA-P256 signer response valid for **current** key |
| Game | ready true; 0 players and 0 matches (not proof of prior player continuity) |
| Mesh v1/v2 | both public interfaces and MESH ≠ MERGE route checked; 0 workspaces (not proof of prior workspace continuity) |
| Market | ready true; HostedProfile/0.41; 4 supported trading pairs; public persistence mode `postgres`, configured true, durable true |
| Zezu | ready true; 2 admitted lineage carriers; 0 reported boot errors |

The Market durability fields are **self-report**, not a direct SQL read or CP10 production restore. An empty external Postgres allowlist remains closed; no DB credentials were obtained or access changed.

## NEW CRITICAL HOLD — signer identity changed across two public contacts

- CP14 genuine independent runner, 2026-10-28 18:24:47Z: `/receipt-key` self-consistent key ID **`8b3898cbd8b0a4527bedf60c`**.
- CP15 genuine independent runner, 2026-10-28 18:41:23Z: `/receipt-key` self-consistent key ID **`07a4b4e6b03528b4740cd060`**.
- Both calls used exactly `https://jm-cloud-contact-server-v05.onrender.com`. Individual public key self-consistency **is NOT historical signing identity continuity**.
- Render application logs recorded original server **startup** messages at 18:22:22Z and 18:41:13Z. Cause of intervening restart, whether original signing key was lost, or why a different public key was served remains unproved. Do not silently infer which hosting mechanism reset it.
- Hosted donor source loads a signing PEM from `JM_CLOUD_RECEIPT_SIGNING_KEY` or its default path, and **generates a new P-256 key if that file does not exist**. This is a relevant mechanism, **not** proof that missing file caused the observed rotation.
- **HOLD:** DO NOT claim stable cross-restart signer identity, ability to verify historical receipts with only the current key, or finished owner custody without an independently pinned owner-held signer and a readback of identical bytes or public identity across actual restarts.
- Future recovery must refuse automatic key regeneration during owner-host admission. CP12 already requires a recovered signing-key PEM and refuses missing/invalid original signer, but the live Render service has not been migrated to that guard.

## Independent Market persistence corroboration (read-only Render logs)

- Following 18:22:22Z server startup, Market boot logs at 18:22:25Z reported PostgreSQL mode, `durable:true`, `ready:true`, `recoveredPriorWitness:true`, `witnessCount:134`.
- Following 18:41:13Z server startup, Market boot logs at 18:41:16Z reported PostgreSQL mode, `durable:true`, `ready:true`, `recoveredPriorWitness:true`, `witnessCount:135`.
- This supports surviving Market witness linkage between launches, but does NOT prove the completeness of every database table, source-file consistency, owner-held recovery, transaction integrity, or cold restore.

## Other remaining hold gates

- GroundZeroJM remained offline at CP15 inspection. No owner-device commands.
- Render PostgreSQL v18 source database remained protected from external hosted MCP by empty IP allowlist; no SQL access, no allowlist changes.
- No owner-controlled offsite checkpoint/media readback, no persistent independently operated restore, no enforced all-writer fence, no TURN relay, no full mobile/laptop gameplay proof.
- Draft PR #599 and CP01–CP14 ancestors remain unmerged. No live source, credentials, Render settings, DNS, data, or billing changed.

**CP15 FLAZ:** PASS for ten public GET organ contracts and integrity of the bounded source/tests/CI. **Signer continuity and durable production recovery: HOLD. NO DING NO CLAIM.**
