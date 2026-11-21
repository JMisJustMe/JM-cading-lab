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

## CP13 — Referenced ancestor preservation (28 October 2026)

The existing private DELETE route now refuses to remove an indexed HTML source when any retained revision's `previousVersionId` still points to it. The API returns HTTP 409 `BODY_ANCESTOR_STILL_REFERENCED` **before changing the index or deleting source bytes**. The owner can explicitly remove a leaf revision first, then an unreferenced ancestor, retaining the previous permitted deletion route. This is not a new body, registry, vault or source migration.

The existing Fake-R2 suite includes a source → revision chain: attempted ancestor deletion must preserve exact index and both stored HTML objects, both remain independently downloadable, then deliberate leaf-first deletion succeeds. This is **synthetic regression only** until CI and real authenticated storage tests independently confirm the result.

**Boundary:** This is direct-child referential integrity, not full offsite backup, cryptographic authorship, cross-provider cold restoration or multiwriter atomicity. Private owner data, credentials, production deployment and native originals are untouched; the PR remains draft and unmerged.

## CP14 — Duplicate body-ID custody ambiguity gate (28 October 2026)

The existing Owner Vault index must contain unique nonempty body IDs. A JSON record with two entries carrying the same ID previously passed shallow shape validation, making source lookup ambiguous and allowing a DELETE to remove both index entries while deleting only one source object. CP14 now fails closed with private HTTP 503 `PRIVATE_CUSTODY_HOLD` before any index-dependent GET, upload, snapshot or DELETE proceeds. No automatic deduplication, source deletion or identity collapse occurs. The original index bytes remain available for deliberate owner recovery.

The inherited synthetic Fake-R2 regression injects a duplicate ID, checks all five affected API routes, proves both original HTML and corrupt index remain byte-identical, then restores the exact healthy index and verifies source download and explicit deletion still work. This is a **candidate draft**: actual CI, authenticated R2, physical device, independent cold restore, concurrent-writer atomicity and production propagation are separate gates. This safeguard does not retrospectively repair a previously damaged index or authorise native Library retirement.


## CP16 — owner-state stale-editor protection (draft candidate, 28 October 2026)
The existing private Owner Room reads a SHA-256 state-revision token with its authenticated manifest and includes it on explicit state sync. A stale token fails with `409 OWNER_STATE_HEAD_CHANGED` without overwriting remote notes, favourites or recent routes. A missing verified baseline fails locally before sync. Successful writes return the new revision; a reload refreshes the token. The server retains compatibility with legacy clients that do not send the optional token; their sequential stale writes are NOT protected by this client precondition. CP15 conditional R2 writes still protect simultaneous same-version commits. Tokens are comparison receipts, never authentication; the owner key remains required. This is source/CI proof only, not live R2, owner-device or deployment acceptance.

## CP17 — malformed integrity metadata custody HOLD (draft candidate, 28 October 2026)

An explicitly present but malformed SHA-256 in an indexed body previously bypassed the digest comparison and could return source as `unverified-legacy`. CP17 makes such index metadata fail closed with `503 PRIVATE_CUSTODY_HOLD` rather than silently downgrading a formerly verified body. Malformed stored byte counts, source-instance types and ancestor-reference types are likewise refused before index-dependent reads or writes. The existing index and HTML bytes are not modified on HOLD. Legitimate missing legacy metadata remains compatible; this does **not** cryptographically verify historical hashless sources.

The existing Fake-R2 court tests malformed metadata against manifest, download, upload, snapshot and delete, checks unchanged corrupt-index and source bytes, then restores the exact healthy index and verifies SHA-256 download. The inherited 2,000-body capacity fixture now uses syntactically valid synthetic hashes. No private source, owner credentials or native Library IDs are changed. Draft/unmerged source and synthetic tests are not authenticated R2, physical-device, full offsite restore or production propagation proof.


## CP18 — revision ancestry custody coherence (draft, 28 October 2026)

An existing private source's metadata must preserve its own complete ordered
revision lineage, not merely contain a correctly typed `previousVersionId`.
The same original Owner Vault API now rejects a body index whose revision
points to a missing ancestor, points to itself or a newer record, or crosses
into another separately intended source/purpose. The original `vault-{id}`
legacy-version inheritance remains explicitly supported. **No repair or
reordering is attempted on corrupted custody**: it returns the existing
private `503 PRIVATE_CUSTODY_HOLD`, retaining the exact source bytes and
index for verified owner recovery.

The inherited Fake-R2 test court manufactures four malformed-ancestry cases,
checks five index-dependent operations for each, proves no original body
or corrupt index was changed on HOLD, then restores the exact healthy index,
re-reads verified HTML and successfully creates the next valid revision.
Distinct intended uses with identical source bytes stay distinct.

This is a **bounded synthetic source-integrity change**, not independently
verified cold backup, real R2 acceptance, actual device editing or deployed
propagation. It remains on the existing CP09/CP15/CP16/CP17 draft branch;
never merge/delete/retire origins solely on synthetic CI. The metadata-only
snapshot is still *not* an independent backup of HTML source bytes.


## CP19 — owner-triggered portable exact-source lineage export (draft, 28 October 2026)

This extends the **original private Vault and Owner Room**, not another backup server.
A new owner-authenticated `GET ?mode=export-lineage&body=<existing-uuid>`
offers a `JM.OwnerVault/0.1.LineageExport` JSON file containing the selected
private HTML source and each original ancestral revision, with unchanged
per-version metadata, original IDs, source-instance identities, SHA-256 and
UTF-8 byte counts. The original Owner Room adds an **EXPORT LINEAGE**
button beside each existing private HTML revision; it independently validates
the returned hashes and ancestry before offering a local browser download.
The same action is kept in the established bundled Owner Room script.

Safety boundaries: owner key required; read-only; no R2 backup copies or
duplicate purpose; maximum 16 versions and 32 MiB of original source bytes
per selected lineage, preflighted before source reads; legacy unverified
digests refused as exact recovery; hash/byte mismatches refused; R2 index
changed during export rejected as a concurrent conflict; no mutation of the
original private index, source bytes or prior ancestors. Other distinct
sources, even with identical HTML, are not silently exported or merged.

**What this does and does not prove:** the JSON is owner-editable and contains
actual source bytes needed for offline reconstruction, unlike the older
metadata-only snapshots. A click offers a download; browser permission,
the presence of the saved file on owner storage, cold re-open, independent
hash verification of the saved bytes, offsite custody, private source import,
live authenticated R2, physical-device use and public deployed propagation
are **distinct HOLD gates**. Nothing is called an independent backup solely
because the API returned HTTP 200 or a synthetic test runner passed. Neither
this branch nor a user's existing live owner data is mutated by CI tests.


## CP20 — independently verified offline source recovery (draft, 28 October 2026)

The original CP19 packet can be saved and carried outside this host. The
**standalone, no-network, no-secret, no-R2** recipient is
`tools/owner-vault-lineage-recover.mjs`. This is a reader of the ORIGINAL JM
Owner Vault's source-complete export, not a new cloud vault, account or
backup service. Requires Node.js 22+ (standard library only).

From a local copy of the utility and an owner-saved JSON packet:

```sh
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --verify-only
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --output-dir ./fresh-owner-recovery
```

The command verifies each UTF-8 original HTML SHA-256, length, unique native
UUID, complete newest-to-oldest chain, original source-instance lineage and
total byte count. It refuses tampered/missing ancestors, cross-purpose
lineage, invalid filenames/IDs, symlink packet, overbounded body counts/sizes
and existing output destinations. An explicit **new** output directory
receives named `<original-id>.html` files (up to 16, 32 MiB total) and
`recovery-manifest.json`, preserving the identity, original body metadata,
individual editable source files and SHA-256 packet custody receipt. The
program does not contact ChatGPT, the browser or the Vault, create other R2
objects, delete originals, overwrite any existing folder, import into a
live host or claim a public deployment.

The existing `tools/test-owner-vault-v0.1.mjs` CI test copies ONLY the
standalone utility and original exported JSON into a separate temporary
directory, invokes the actual Node CLI to reconstruct three exact original
versions, proves a distinct same-byte purpose was not merged, and uses
adversarially malformed saved packets and an existing destination to prove
fail-closed behaviour. Generated synthetic test files are disposed after
testing; user artifacts are never accessed by the CI fixtures.

**Honest boundary:** GitHub CI proves synthetic independent-file recovery
using the saved packet format, not owner physical-device use, actual downloaded
packet custody, private Cloudflare R2 data, independent offsite backup,
human acceptance or production release. The packet SHA-256 is an
integrity receipt, **not cryptographic authorship or a signer guarantee**;
an adversary who can replace both packet contents and their checksums
would need a separate authenticated anchor to be detected. Keep any real
export private: it contains the complete owner's source HTML.
The source candidate remains **DRAFT / UNMERGED**; live owner/device/prod
gates stay HOLD.

Governed by same-PR prospective Build Route Manifest
`registry/build-routes/JM_OWNER_VAULT_CP20_OFFLINE_RECOVERY_BUILD_ROUTE_MANIFEST_v0.1.json`
after native entry gate identified this new executable path.


## CP21 — independent cold-reload integrity audit (draft, 29 October 2026)

The same CP20 standalone, offline utility now supports **read-only auditing of
a previously recovered directory in a fresh process**. This closes a specific
verification gap: CP20 proved bytes at initial write, but its existing
`--verify-only` checked only the saved export packet, not the HTML and
manifest remaining on disk after a later restart or accidental modification.

```sh
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --audit-dir ./fresh-owner-recovery
```

CP21 reopens the saved packet, checks its SHA/ancestry, independently lists the
recovery directory, rejects missing/extra/symlinked files, checks the exact
manifest identity and original-version metadata, then compares every recovered
HTML byte against its packet content and original SHA-256. It **never repairs
or overwrites edited files**, never writes to the original R2 Vault, and
does not treat a deliberately edited original as unchanged: owner edits should
be preserved as separately named descendants, not silently declared exact
originals. The test court performs a new-process audit after restore, then
adversarially modifies source, manifest, inventory and directory type to prove
failure without changing R2 or deleting the owner recovery.

A successful audit is **local disk readback against the supplied packet**, not
an independently authenticated packet origin, owner-device test, cloud custody,
offsite backup, production merge or deployment propagation. A malicious party
able to replace both packet and files could evade this unanchored comparison;
preserve the separately recorded packet SHA in trusted custody. CP21 remains
a draft candidate until actual owner-device and production gates are met.


## CP22 — non-destructive interrupted offline recovery (draft, 29 October 2026)

The original CP20/CP21 offline recovery recipient previously used a recursive
`fs.rm(destination)` if an error occurred after creating the recovery folder.
That could destroy already recovered source bytes or unrelated owner files
placed in the new folder before a late write failure. **CP22 removes this
destructive failure cleanup.** The same existing recipient records the
directory identity it created, then only removes that directory with
nonrecursive `rmdir` if it is still the same directory and completely empty.
If original HTML, a partial manifest, an unexpected file or a replacement
directory remains, it is **preserved for owner inspection**. This is a HOLD,
not a successful recovery, and the original R2 Vault is untouched.

The inherited synthetic regression checks preserved partial HTML, an empty
failed directory, a redirected symlink destination and a replaced real
directory. The recovery remains deliberately fail-closed and never deletes
pre-existing destinations. This addresses the offline cleanup data-loss
hazard, not an absolute filesystem-race guarantee; a concurrent hostile
actor controlling the parent directory can still race pathname operations.
Actual owner-device editing, real saved packet recovery, authenticated R2,
independent offsite custody and deployment propagation remain HOLD.


## CP23 — reject redirected ancestors during offline recovery and audit (draft, 29 October 2026)

The existing CP20–CP22 recovery utility checked only the immediate parent of a
new output directory and the final audit directory. A normal directory reached
through a **symlink in an earlier path component** could therefore be accepted:
a recovery could write outside the owner's intended physical path, and a
read-only cold audit could report success through that redirected path.

CP23 adds a component-by-component `lstat` refusal to the **same** offline
recipient before creating a recovery directory and before accepting a cold
audit. The existing packet verification, exact-source ancestry, immutable
originals, distinct intended uses, no-overwrite output and CP22 non-destructive
cleanup remain intact. Adversarial CI tests use an intermediate symlink to
attempt both recovery and audit, require explicit HOLD, verify that no output
was created through the link, and preserve a positive normal-path audit.

**Bounded proof:** This is a preflight protection against already-present
symlink ancestors, not an atomic directory-handle guarantee against concurrent
path replacement. Real owner-device recovery, independently authenticated
packet custody, R2 writeback, production deployment and propagation remain
HOLD. No private source or owner data is included in the synthetic tests.


## CP24 — exact offline recovery receipt integrity (29 October 2026)

The existing CP20/CP21 independent recovery CLI now uses **one deterministic manifest contract** for writing, immediate independent disk readback and later cold audit. Previously, restore acknowledged success after checking only packet SHA and ancestor count in its saved manifest; audit checked a few fields but could accept an altered custody boundary or an injected claim that offsite recovery/deployment had been verified. CP24 requires exact manifest bytes on initial readback and exact canonical receipt text on later audit. An altered boundary, extra field, changed formatting or forged status is **HOLD**, never a completion claim.

The original source HTML, immutable ancestry, separately intended uses, owner-selected destination, and CP22 non-destructive partial-recovery protections remain unchanged. Two new adversarial cold-audit tests exercise a forged offsite/deployment boundary and an injected owner-device success flag; a restored authentic manifest must pass again. This is **local offline integrity**, not packet origin authentication, physical-device recovery, race-proof filesystem custody, real R2, external cloud writeback, or production deployment. The existing draft PR stays unmerged pending CI and owner contact.


## CP25 — crash-durability acknowledgement gate (29 October 2026)

The same existing offline lineage recovery utility previously acknowledged exact
HTML and manifest readback without calling fsync. A power loss or OS crash
could therefore lose newly written source bytes, the manifest, or directory
entries despite a successful return. CP25 uses exclusive private-mode file
handles and explicitly syncs **each original HTML file and the manifest**
before closing. After exact readback, it synchronises the recovery directory
and its parent (the new directory entry), checks directory identity, and
acknowledges recovery only if all these operations succeed.

A failed or unsupported file/directory sync yields **HOLD_NO_RECOVERY**,
not a claim of durable custody. CP22's nonrecursive cleanup still preserves
any partial original bytes for owner-guided investigation. The existing
synthetic test court checks write/sync/close ordering, private exclusive
creation, refused file and directory sync failures, and non-directory
refusal. Actual offline recovery also exercises the new fsync path in CI.

**Boundaries:** Filesystem fsync is an OS durability request, not proof of
physical power-loss survival or a separate-device cold restore. Concurrent
hostile pathname replacement is not fully eliminated; packet authenticity,
offsite custody, owner-device edit/reload, authenticated R2 persistence,
private source migration and deployment propagation remain HOLD. This is
an unmerged draft candidate, not a deployed release.

## CP26 — opened-file identity gate for offline source reads (29 October 2026)

The existing offline recipient previously used path-based `lstat`/`readdir`
preflight followed by a separate `readFile(path)`. A final file component
replaced with a symlink between those operations could redirect a source
read outside the intended recovery packet/directory. CP26 strengthens that
same recipient, **not a new Vault or registry**, by opening source and receipt
files with `O_NOFOLLOW | O_NONBLOCK | O_RDONLY`, checking the **opened file
handle** is a regular bounded file, reading from that handle and closing it
on every path. This covers packet ingestion, immediate restore readback and
subsequent independent cold audit; malformed/unavailable no-follow support
fails closed. The existing CP20 ancestry, CP22 non-destructive partial
recovery, CP23 directory preflight, CP24 exact receipt and CP25 fsync gates
remain intact.

The synthetic adversarial regression checks a genuine final-component
symlink, directory and oversized source refusal, required no-follow/nonblock
flags, normal regular-file success and handle close on refusal. This is
**final-component protection**, not an atomic guarantee against hostile
concurrent replacement of ancestor directories, nor authenticated packet
provenance, real R2 restore, owner-device acceptance, offsite custody or
deployment propagation. Keep draft/unmerged until the actual CI and owner
contact gates are proven; preserve all original private sources and Library IDs.

## CP27 — packet input ancestor redirection refusal (29 October 2026)

The original CP20–CP26 offline recipient protected the packet's **final** file
component with `O_NOFOLLOW`, but `--verify-only`, `--output-dir` and
`--audit-dir` could still read a packet through a symlinked **ancestor**
directory. CP27 reuses the existing CP23 component-by-component directory
preflight on the packet input parent **before reading packet bytes** in all
three modes. The original no-follow opened-file check remains in force.

The existing CP20 independent-process test exercises a redirected packet in
all three CLI modes, verifies explicit `LINEAGE_PATH_COMPONENT_UNSAFE` HOLD,
checks that no recovery directory was created, and confirms the normal exact
packet and cold audit still work. This is a bounded pre-existing symlink
protection, **not** a race-proof directory-descriptor guarantee against
concurrent ancestor replacement. The source stays draft/unmerged; real
owner-device recovery, independent packet-origin authentication, private
GitHub migration, authenticated R2 and deployed propagation remain HOLD.
No original owner file or Library identity is deleted, migrated or replaced.


## CP28 — post-stat source growth bounded-memory recovery (29 October 2026)

The existing CP26 opened-file safety gate checked the initial file size but
then called `FileHandle.readFile()`, which can allocate until EOF. A packet or
recovered source appended after the initial `stat` could consume more memory
than the declared cap before the post-read check. CP28 strengthens the same
original offline recovery CLI: incremental opened-handle reads request at most
64 KiB per call and never accept more than `maxBytes` in total. The first
byte over the limit produces `LINEAGE_OPENED_FILE_OVERBOUNDED`; handles close
on success and failure. No original source, identity or role is rewritten.

The CP28 synthetic regression checks exact normal reads, a file growing
after `stat`, zero-byte sources, bounded read requests, absence of
unbounded `readFile` calls and handle closure. Existing CP20 cold recovery,
CP24 exact manifest, CP25 fsync, CP26 no-follow and CP27 input-ancestor
refusal remain enforced. This is a source/CI candidate, **not** an authenticated
owner-device restore, private offsite custody, physical crash proof or
deployment. PR stays DRAFT/UNMERGED; no private source or Library ID retired.


## CP29 — identity-bound no-follow directory durability (29 October 2026)

The existing CP25 offline recovery durability helper opened the recovery and
parent directories with ordinary `'r'` handles after earlier pathname
preflight. A substituted final directory symlink or replaced directory could
therefore be synchronised instead of the original recovery location, even
though subsequent identity checks might refuse final success. CP29 strengthens
that SAME helper: directory fsync opens with `O_RDONLY | O_DIRECTORY |
O_NOFOLLOW`, validates the **opened** directory's device/inode against the
previously captured parent or newly created destination, and refuses before
fsync on mismatch. Unsupported no-follow/directory-open support yields HOLD.

The original CP20–CP28 source, ancestry, bounded source reads, private file
permissions, nonrecursive partial recovery and exact manifests remain in place.
New adversarial tests exercise symlinked directory refusal, rename-and-replace
inode mismatch, unchanged original-directory success, explicit no-follow flags,
and close-without-sync on mismatch. Existing recovery and audit regression
still must pass. This is a draft source/CI safety gate, NOT an atomic guarantee
against hostile concurrent ancestor replacement, a physical crash test,
owner-device edit/reload, offsite restoration, authenticated R2, private-source
GitHub migration or production propagation. No original Library IDs or
purpose-specific carriers are retired.
