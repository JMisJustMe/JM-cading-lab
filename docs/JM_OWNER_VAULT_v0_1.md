# JM Owner Vault v0.1 — Durable Owner Room Graft

**Status:** STAGED / FAIL-CLOSED / NOT YET LIVE / NOT DINGED  
**Parent:** JMISJUSTME — The Owned Web Estate  
**Existing public door:** `jmisjustme-estate.pages.dev`  
**Storage graft:** Cloudflare R2 through a Pages Function

## What this is

The Web Estate is already live and already has a governed permanent-HTML repository intake pipeline. The actual missing organ is narrower: the root Owner Room currently keeps notes, favourites, recent routes and mounted HTML in browser-local storage.

Owner Vault v0.1 adds a **private durable copy** behind that existing local-first room. It does not replace GitHub, Wisebase, BodyMesh, the Estate registries, the permanent body pipeline, or the local working shelf.

> Local is the working shelf. R2 is the private durable vault. GitHub remains the deliberate public/versioned promotion rail.

## Non-negotiable boundary

Nothing uploads automatically.

The client bridge adds an explicit **Sync local shelf to vault** control. Until the owner presses that control, the existing local behaviour is unchanged. A private R2 object is not a public-publication claim.

## What v0.1 stores

- Owner notes.
- Favourites.
- Recent routes.
- Standalone HTML bytes explicitly selected/mounted locally and then explicitly synced.
- A private body index containing name, file name, byte count, SHA-256 and upload time.
- Optional metadata/state snapshots that reference the body index without duplicating HTML bytes.

**Founding v0.1 historical policy:** Byte-identical HTML was deduplicated by SHA-256. This proved insufficient to preserve separately intended uses and is superseded by the CP04 protected-use correction below.

## Security model

The API is fail-closed unless **both** are present in the Cloudflare Pages production environment:

1. R2 binding: `JM_OWNER_VAULT`
2. encrypted Pages secret: `JM_OWNER_VAULT_KEY`

The public source never contains the owner key. The owner enters it when unlocking the Owner Room; the browser keeps it in `sessionStorage`, so closing the session removes it. Private API responses are `no-store`, and the Estate service worker is patched to bypass `/api/owner/` completely.

This is the bounded v0.1 owner gate. Cloudflare Access can later replace the session-key gate while preserving the same R2 contract.

## Cloudflare mounting steps after the PR is approved

The code can safely merge before the storage binding exists: the API returns a fail-closed `503` and the ordinary local Owner Room keeps working.

To turn the durable vault on:

1. In Cloudflare R2, create a private bucket such as `jm-estate-owner-vault`.
2. In the `jmisjustme-estate` Pages project, add an R2 binding named exactly `JM_OWNER_VAULT` pointing at that bucket.
3. In Pages **Variables and Secrets**, add an encrypted secret named exactly `JM_OWNER_VAULT_KEY` with a long unique owner key.
4. Redeploy the authoritative Estate workflow.
5. Open **Owner → JM Owner Vault**, choose **Unlock this session**, then press **Sync local shelf to vault**.
6. Verify remote body count and preview/download one private copy before making any completion claim.

## Existing permanent-body route remains authoritative for publication

The repository already includes `tools/Promote-JMHtmlBody.ps1` and acceptance tests for byte-preserved HTML promotion. Owner Vault does not bypass that route.

A useful private body can move:

**local working copy → explicit R2 durable copy → deliberate permanent repository promotion → reviewed commit → Cloudflare public proof → receipt / Ding**

The stages are distinct on purpose.

## Files introduced

- `estate-owner-vault.js` — isolated source for the Owner Room UI bridge.
- `functions/api/owner/vault.js` — same-origin private Pages Function.
- `registry/owner-vault-contract-v0.1.json` — boundary/contract.
- `tools/apply-owner-vault-v0.1.py` — idempotent graft into already-deployed crown files.
- `tools/test-owner-vault-v0.1.mjs` — fail-closed/storage contract tests.
- `.github/workflows/test-owner-vault-v0-1.yml` — branch acceptance and bounded graft workflow.

## Graft edits

The existing authoritative deployment already publishes `estate-app.js` and `sw.js`, so the apply tool deliberately leaves the root HTML and deployment workflows untouched.

It changes only:

- `estate-app.js` — appends the isolated Owner Vault bridge behind explicit begin/end markers. This makes the current Owner Room surface the durable-storage controls without creating another public shell.
- `sw.js` — bumps the Estate shell cache and refuses to intercept/cache `/api/owner/` traffic.

No existing body is merged, renamed, deleted or re-authored. The deployment rail remains the same rail.

## Acceptance result boundary

The v0.1 contract test proves the fail-closed API, owner-state persistence contract, HTML storage, SHA-256 duplicate avoidance, private download, metadata snapshot and deletion using a fake R2 implementation. The crown graft separately proves that the bridge lands in the existing app and private API traffic bypasses the service worker.

That is code/build proof, not live-storage proof.

## Claim boundary

Until an authenticated live write/read/delete proof succeeds against the bound private R2 bucket, the correct state is:

**CODED / TESTED / GRAFTED / STORAGE NOT YET PROVED LIVE.**

No Ding, no claim.

## CP04 protected-use correction — 28 October 2026

The original policy collapsed differently intended copies when their HTML bytes matched. The current source correction preserves the difference between **content identity** and **use/body identity**.

- The existing local mounted-body ID is forwarded as `sourceInstanceId` on explicit owner sync. A repeat upload of that **same ID and SHA-256** returns the already-held record without creating another.
- Different mounted IDs remain distinct private records even when bytes, filename and title are identical. Exact-byte sameness alone is never retirement authority.
- If the same mounted ID is edited, the changed bytes create a new private version with a `previousVersionId` link. The earlier version remains available until explicitly targeted for deletion.
- A legacy client without a stable ID is preserved as a new use rather than guessed to be redundant. On reaching the 2,000-record index limit, new writes are refused without dropping an older record.
- The marked Owner Room graft now updates from its existing source safely without resetting newer service-worker versions or creating another public shell.

**Proof status:** Source code and synthetic private-storage contract QA are required. The historical Owner Vault authenticated state-roundtrip receipt remains separate; it does not prove this CP04 policy on the current production backend. A live public-safe API policy marker and authenticated owner write/reload readback are distinct rollout gates. No secret or owner file is included in this document.

## CP05 — Private source editing inside the existing Owner Room (28 October 2026)

CP05 adds **EDIT SOURCE** beside the existing private Vault Preview, Download and Remove controls. A source textarea opens only after the existing owner-key authentication. Clicking **Save private revision & verify readback** submits the new HTML to the same private Vault API and creates a **new protected body/version**; it does not overwrite or retire the ancestor.

The server requires the selected body ID and its expected SHA-256. A stale base version, mismatched hash, non-HTML input or full index fails closed. After saving, the client re-fetches the new private HTML and verifies both its exact content and SHA-256 before showing a successful private-save message. Every separately intended body retains its independent identity. The source editor does not publish an app or modify GitHub/deployed source automatically.

**Proof boundary:** CI tests the private API against a synthetic R2 store, checks the mirrored existing Owner Room source, and production workflow checks a public-safe policy marker. Actual owner-key authenticated production write/reload/readback on a real device is a separate gate. No private key or owner document is placed in public source.

## FLAZ CP05–CP06 · bounded closure 28 October 2026

The existing source and deployment receipts close private editing and direct Owner Room contact at **source, test, and public-safe deployed-code** scope. CP05 mainline source commit `1d432648cc171285c649b4d29372855658683910`; CP06 `18a57bb92b64d63f70d2be51bf23db84382a92f7`. The durable Owner Vault readiness receipt verified at `2026-10-28T16:09:35.733270+00:00` confirms both the live API policy and deployed Owner Room editor-source markers. The existing synthetic-R2 tests and phone/desktop browser journeys passed. **Real authenticated owner production writes, physical-device restoration and Estate-wide independent editing remain separately unpassed.**

## CP07 · local preservation and private-to-device recovery

An actual data-loss route was identified in the original local mounting code: when `localStorage.setItem` failed, its catch block cleared the entire in-memory mounted shelf and removed the storage key. The 12-item `.slice(0,12)` could also silently evict older bodies.

CP07 corrects this *inside the existing Estate*:

- Local HTML imports commit through one atomic storage call, then update in-memory state. On quota, existing mounted content remains unchanged.
- At 12 bodies, importing or restoring refuses without evicting the oldest. Existing removals use the same atomic/rollback discipline.
- The original Owner Vault offers **RESTORE TO DEVICE** for each private HTML version. The owner signs in through the existing private session; HTML bytes are fetched privately and SHA-256 checked against that exact version before entering the current local mounted shelf.
- Every restored local copy carries its private version ID, source identity, ancestor ID and SHA-256. Repeat restoration is idempotent. Ordinary local-shelf Sync skips already-restored Vault copies so a readback cannot accidentally create another private body or revert the current head.
- The browser reloads the original Estate after a committed local restore, demonstrating durable device storage instead of an in-memory-only display.

**Proof boundary:** synthetic authenticated browser tests, source mirroring and existing deployment rail are the scope of the CP07 implementation; a real owner device/vault-key roundtrip is a separate next proof gate. No key is stored in code and no private user document is copied by this source change.


## CP08 — Authenticated owner-session contact harness (28 October 2026)

The original Owner Room adds **Prove private save → reload → recovery**. This only operates after the owner explicitly presses the button and authenticates with the already-supported owner-session key **inside the Estate**, never through ChatGPT.

1. It creates a random, uniquely named *temporary test body* (not an owner's real creation). A local checkpoint is saved **before** any private write. If a network acknowledgement is lost, the test looks up the original unique private source ID; it **never replays** a potentially committed write.
2. It checks the exact temporary HTML bytes and SHA-256 through the authenticated private API. A real page reload then independently fetches and checks the exact content again.
3. After both checks, the existing delete route removes only the precisely identified CP08 temporary body. The owner-key session, temporary identity, name, file name and hash gates prevent unrelated JM creations being deleted. The returned private index must show the temporary record gone.
4. Only then does the browser record **PASS**, in a private on-device receipt with no owner key or personal content. The owner can export a stand-alone JSON proof. Interrupted tests remain **HOLD**, with a recoverable checkpoint, and are not silently restarted as a new test.

The repository and live workflow can prove *the harness is coded, browser-tested and deployed*, but **cannot honestly claim the owner has used their own authenticated session**. Synthetic browser tests are intentionally labelled synthetic; no live key is invented, fetched, displayed, or transported into a CI job. On-device owner proof is a distinct explicit-contact DING, and separate from independent editing of all Estate bodies and from testing another physical device.


## CP09 custody convergence — source candidate, 28 October 2026

Recovered the original Owner Vault and two prior unmerged strengthening candidates. On the current-main repair branch the existing API refuses a pre-existing malformed, unreadable or structurally invalid private body index or owner state with generic no-store HTTP 503 `PRIVATE_CUSTODY_HOLD` rather than mistaking it for an empty shelf. A genuinely absent first-run record still boots. Owner-state PUT checks the stored state first. Upload, revision, deletion, read and snapshot refuse a corrupt index without discarding existing private metadata. No automatic recovery, deletion or source publication occurs on HOLD.

The same candidate inherits CP06's independent re-read of HTML body bytes, SHA-256 and full intended body index. These checks detect missing/altered write acknowledgements; they do **not** prove transactional multi-writer atomicity, durable rollback after partial failures, or physically independent offsite restore. Concurrent writes remain a separate architecture HOLD.

The in-memory Fake-R2 regression court uses synthetic data only. CI success is **not** authenticated real-owner private-source editing, Cloudflare production propagation, physical device acceptance or independent owner recovery. Keep all these gates open until separately proved. See issue #591 and draft PR for branch audit evidence.

## CP12 — Source-safe deletion and exact snapshot custody (28 October 2026)

This is an additive hardening of the **existing** Owner Vault, not a replacement backend or an automatic production release.

- Deletion first checks that the targeted private HTML matches its recorded byte count and SHA-256, then updates **and independently verifies** the full body index, **then** deletes the source object and independently checks that deletion took effect. If index persistence fails, the source object is not deleted. If deletion fails after index commit, an **orphaned private object remains for manual recovery**, and the API refuses a success claim; it does not overwrite a possibly concurrently updated index to roll back.
- Snapshots now use a UUID alongside their timestamp so rapid repeated snapshots cannot overwrite each other. A snapshot acknowledgement requires an independent **exact-byte** JSON readback. Missing, dropped, unreadable or altered snapshot writes return `SNAPSHOT_READBACK_MISMATCH`.
- The existing Fake-R2 regression suite injects failed index writes, corrupted source bytes, silent deletion failures, duplicate-timestamp snapshots, dropped snapshot writes and altered snapshot bytes. The tests use synthetic source only.

**Boundaries:** Snapshots contain owner-state and body-index metadata, **not the HTML body bytes**; they are not complete offsite backups. An interrupted delete after a verified index commit can leave an unindexed R2 object. Concurrent writers remain unprotected by a transaction/lock, and physical-device, authenticated live-R2, independently recovered cold restore and production propagation remain **HOLD**. The branch is draft/unmerged. No private source, key or owner payload is included in this public repository.
