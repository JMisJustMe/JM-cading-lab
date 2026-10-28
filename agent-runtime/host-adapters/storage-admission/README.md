# JM M001 — Storage Steward carrier admission adapter

**Identity:** A thin read-only host plug that inherits the existing JM storage/recovery and Build Mesh governing laws. It is not a new sovereign coding body, not a replacement for the M001 Residency Transfer Gate, and not a source authority.

**Run:** `python3 JM_M001_Carrier_Admission_Gate_v0_1.py --candidate NEW.zip --keeper ESTATE_HOUSE.zip`

**Return schema:** `JM.M001.CarrierAdmission/0.1`. States: `SAME_BYTES_ROLE_HOLD` (the exact payload exists in the keeper; owner direct-access/role release still required), `DISTINCT_BYTES` (preserve real variation), `HOLD_INVALID` (do not admit or retire).

**Test:** `python3 JM_M001_Carrier_Admission_Gate_v0_1.py --self-test` runs seven synthetic, fail-closed checks. GitHub Actions runs those checks only. It does not contact the private Library and cannot establish real-carrier residency, authorise Trash, measure ChatGPT quota or report Fold contact.

**Source boundary:** The original JM M001 CP16 ContactGate, typed Mesh Contact Runner, private carrier hashes/IDs/receipts and the Library evidence ledger stay in their original separate private authority. No private source bytes are committed to this public repository. Work can pass local files from existing owner custody when authorised. Future build workflows may invoke this adapter before proposing a redundant upload, but no existing build pipeline is automatically intercepted by this addition.

## Mandatory production admission

The original `JM_M001_Carrier_Admission_Gate_v0_1.py` is unchanged. The thin
`jm_m001_production_admission.py` policy adapter calls it for every applicable
PACKAGE PASS, including direct `update_stage` API calls. Omitting either the
candidate or independent keeper is HOLD. A missing/corrupt keeper never means
that a package is new.

- Distinct bytes may enter the existing separate evidence gate.
- Same bytes require `--reuse-existing` to resolve PACKAGE without another
  upload, or an exact pinned separate role in
  `registry/storage-admission/approved-roles.json`.
- The role registry is empty. A CLI role name or a protected label cannot
  approve itself. A reviewed role must bind candidate/keeper SHA, distinct
  responsibilities and an independently readable evidence file by SHA.
- `PACKAGE N/A` retains its existing applicability rule and explanation.
  It is not upload permission.

```bash
python3 scripts/jm_build_closure.py --state-file /path/to/closure.json \
  --stage PACKAGE --state PASS --evidence external:verified-package \
  --admission-candidate /path/to/candidate.zip \
  --admission-keeper /path/to/keeper.zip
```

Controlled routes changed:

| Route | Mandatory consequence |
|---|---|
| Closure PACKAGE PASS, API and CLI | Check before ledger write; duplicate additional carriage HOLD; explicit keeper reuse recorded |
| Advanced Generator package workflow | Build in scratch; check before output replacement; identical members also reuse despite old ZIP timestamp differences; reuse skips artifact upload and metadata commit |

`python3 scripts/test_jm_m001_production_admission.py -v` tests actual public JM
package bytes plus explicitly labelled test descendants and role authorities.
Private RIOT carriers are tested only in the authorised Work host, never CI.
The separate-role test registry is a fixture, not actual owner approval.

Boundary: these routes have no ChatGPT upload API. This is not account-wide
interception. Other Android/RouteCore artifact workflows have separate producer,
keeper and deployment contracts; they are not silently redirected or blocked by
this change. Their migration requires mapped independent keeper inputs, not a
blanket assertion that a successful artifact build authorises native intake.

## Real product contact — KICSHIFT original portable source

The opt-in GitHub pre-delivery route builds the **existing** JM KICSHIFT portable source into an ephemeral dist directory and compares it against the **existing** frozen games-beyond/kicshift Estate mount. It changes neither source, mount nor user-facing URL. Two deployable trees are packaged independently with normalized ZIP metadata; the keeper's separate PORTABILITY_MANIFEST.json is excluded from the deployable-only comparison. File names and bytes remain intact.

**Observed contact (25 October 2026):**
- Real Vite build from untouched source: PASS (3 deployable files).
- Dirty second build with generated dist present: **FAIL** — JS/CSS output hashes changed despite no source edits. Build process exit did not prove repeatability.
- Corrected CI: preserve first output in ephemeral scratch, remove **only generated dist**, rebuild under the same installed dependencies: **3/3 exact byte and filename parity PASS**.
- Historical frozen Estate carrier comparison: **DISTINCT_BYTES**, with different asset names/payloads. This is **historical carrier-parity HOLD**, not gameplay regression evidence or a release-promotion licence. The dependency versions are not pinned to the frozen build's exact environment by this test.
- **No Library mutation, publication, replacement, quota credit or owner-device claim.**

The failed dirty-run receipt remains in GitHub job history; the correction is cleaning only generated outputs before repeatability comparison, not weakening the test. Repeated-source ancestry never substitutes for actual output identity.

**Execution boundary:** GitHub tests real publicly stored JM source/mount files, not private ChatGPT Library storage. Existing age/role/retirement requirements remain with Work and owner.


## CP22 post-processing retention (read-only, 28 Oct 2026)

**Extension of M001, not a new registrar.** CP22 compacts declared structured capture/receipt/version events while preserving the body, version, event, individual carrier, SHA-256 and each actual or intended use.

Decisions: `KEEP_SEPARATE_USE_OR_SOURCE` for creative originals, executable sources, required assets, recovery anchors and any independent use; `HOLD_INCOMPLETE_PURPOSE_OR_PROOF` for unknown or incomplete cases; `REVIEW_ONLY_POSSIBLE_LEAN` for historical receipts or process captures only when extracted facts, proof and recovery references are all supplied and the purpose review is declared cleared. None authorises deletion, source substitution, quota credit or independent provider authentication.

Run locally against an already prepared observations manifest (does not itself analyse raw screenshots/videos):

```bash
python3 agent-runtime/host-adapters/storage-admission/JM_M001_POSTPROCESS_RETENTION_CP22.py --manifest /path/to/observations.json --output /path/to/NEW-compact-receipt.json
python3 agent-runtime/host-adapters/storage-admission/JM_M001_POSTPROCESS_RETENTION_CP22_TESTS.py
```

Input schema: `JM.M001.PostprocessInput/1` with a `records` array. Each record requires `carrier_id`, `body_id`, `version`, `event_id`, `event_summary`, `kind` (`image`, `video`, `receipt`, `version`, `other`), `purpose`, `bytes`, `sha256`, `separate_uses`, `extracted_facts`, `proof_refs`, `recovery_refs`. Optional declared review fields are `extraction_complete`, `structured_custody_verified`, and `use_review` (`affirmatively_cleared` only for a review candidate). Output is a compact JSON index/receipt, **not a verified substitute for missing source bytes**.

CP22 never touches original media, never overwrites an existing receipt, never deletes or updates the native Library and claims zero realised storage savings. The owner-purpose and recovery proof gates remain independent. An identical event/hash is only a comparison signal: individual roles/identities are not merged. Current production admission and original CP21 remain unchanged; an authorised host must supply its own real evidence before applying postprocessing.


## CP23: Magnifying Glass × Storage Steward × CP22 evidence contact

`JM_M001_REAL_EVIDENCE_BRIDGE_CP23.py` is an additive, read-only recipient of the **already established** JM Magnifying Glass CP05 pin set. It takes three original private-source manifest formats: CP04 Purpose Graph, CP02 image proof manifest and CP12 website edition/cold-restoration manifest. Their historical SHA-256 pins are checked against actual input bytes before parsing. CP04's internal graph digest and aggregate/protected-role invariants are separately checked.

After host-local contact, the bridge sends **39 individual carrier records across 16 body/edition identities** to the existing CP22 compiler: 5 root-house pairs (10 carriers), 25 original images in 7 project houses, and 4 independent website edition ZIPs. It refuses to identify any original as disposable: all 39 are preserved as separate-use/source roles. Original media, code, per-carrier provider IDs, declared current-head decisions and private manifests are **not copied into public source control**.

To use with existing private, authorized source files (run locally, not in public CI):

```bash
python3 agent-runtime/host-adapters/storage-admission/JM_M001_REAL_EVIDENCE_BRIDGE_CP23.py \
  --sources /path/to/authorized/three-source-manifest-folder \
  --output /path/to/new-private-cp23-receipt.json
python3 agent-runtime/host-adapters/storage-admission/JM_M001_REAL_EVIDENCE_BRIDGE_CP23_TESTS.py
```

CP23 stdout contains counts only. The optional output file is created with exclusive new-file semantics and contains the owner-private detailed records; do not publish it. Pin verification proves **historical manifest exactness**, NOT fresh authenticated private provider state, exhaustive purpose release, live link recovery, a new-media pixel inspection, or storage quota savings. CP22 cannot infer a safe media deletion from an already compacted index.

Synthetic CI tests exercise identity preservation, source-pinning, role spoof refusal and the zero-mutation/zero-savings boundary. CP04/CP05 source remains the sovereign inspection/provenance authority; this is only an additive M001 retention recipient.


## CP25 — exact byte cold-edition reconstruction

CP25 is another additive M001 Storage Steward extension. It restores a *distinct* ZIP edition from a retained exact base ZIP, an independently pinned zstd patch and a role-preserving receipt. It validates source sizes/SHA-256, restored whole-ZIP SHA-256, ZIP member CRCs, and refuses existing output paths. It never modifies source or authorizes native retirement.

Use:

```sh
python3 agent-runtime/host-adapters/storage-admission/JM_M001_EXACT_DELTA_RESTORE_CP25.py --manifest private-receipt.json --base retained-base.zip --patch edition.zstpatch --output new-restored-edition.zip
```

Requires `zstd` CLI. The public CI test uses synthetic ZIPs only; the genuine owner source and compact delta are retained in the owner's private custody.

**Current bounded real proof (28 Oct):** source and target were 27,788,316 B and 27,830,608 B, both independently materialized native originals; patch 498,489 B; theoretical reduced carriage 27,332,119 B. Whole target ZIP independently restored byte-exact; 33 ZIP member CRCs passed. An independently fetched PRIVATE Google Drive base + cold pack also reconstructed target exactly, with fresh SHA-256 matching the original. All original native Library source/current delivery routes remain untouched. Actual quota saved **0 B verified**. No original Library carrier retirement or direct-link release is authorized.


## CP26 — exact eight-edition music lineage via existing CP25

The existing JM M001 CP25 restorer now has a **read-only eight-edition orchestrator**: `JM_M001_EDITIONS_RESTORE_CP26.py`. CP01 and CP04 remain full independent archive anchors; exact edition-specific zstd deltas restore CP02, CP03, CP05, CP06, CP07 and CP08. Every restored full ZIP must match its original whole-file SHA-256 and ZIP member CRCs before a newly created output directory is promoted. **This does not merge version identities or release any direct native download role.**

Run against privately owned exact source bytes (Python 3 + `zstd` CLI):

```sh
python3 agent-runtime/host-adapters/storage-admission/JM_M001_EDITIONS_RESTORE_CP26.py --pack /private/JM_M001_CP26_EIGHT_EDITION_PRIVATE_COLD_DELTA.zip --base-cp01 /private/JM_LYRICS_MUSIC_SIX_BODY_CP01_FLAZ_2026-10-27.zip --base-cp04 /private/JM_LYRICS_MUSIC_MIX_FORGE_CP04_FLAZ_2026-10-27.zip --output-dir /new/RECOVERED_EIGHT_EDITION_SOURCES
python3 agent-runtime/host-adapters/storage-admission/JM_M001_EDITIONS_RESTORE_CP26_TESTS.py
```

**Bounded genuine contact, 28 October 2026:** eight original distinct Music CP01–CP08 ZIPs totalling 221,184,666 B; two full anchor ZIPs 55,219,071 B; six patch bytes 20,640,733 B; single private 10-member delta pack 20,659,338 B; combined cold representation 75,878,409 B. Exact reconstruction 8/8 from native sources, and separately 8/8 from **independently downloaded owner-private Google Drive cold files** (two exact anchors plus delta pack), including whole-file SHA-256 and ZIP CRC. Conditional cold-carriage difference 145,306,257 B; **actual native Library quota savings 0 B measured**. Original native hot carriers and separate purposes all remain KEEP/HOLD.

Private CP26 pack and original source archives live in the owner's existing JM Estate Cold Recovery house, **not the public repo**. Small source, regression and detailed FLAZ receipts live separately in the existing private JM Estate Storage Steward Library house. This public GitHub lane contains only reusable executable code, synthetic tests and bounded accounting. For offline recovery, the private pack also includes the original CP25 and CP26 source plus a README. The CI workflow inherits the earlier M001 gate/CP22–CP25 tests; CP26 adds a 20-check adversarial synthetic run without publishing original content.


## CP27 — byte-exact Slingfall APK installer lineage

CP27 reuses original M001 CP25 byte-exact `zstd --patch-from` restoration, and the CP26 multi-edition/purpose-preserving approach, for **13 distinct Slingfall native Library APK carrier identities**. These are **11 distinct complete APK bytes** plus two separate same-byte distribution roles. `JM_M001_APK_LINEAGE_RESTORE_CP27.py` reconstructs all 13 *named* APK carriers from one protected full CP17 native APK and 10 private patch members, creating a new directory only after all whole-file SHA-256, exact size, ZIP member CRC/count and source signing-metadata-presence checks pass.

Private, owner-only source custody (not in public GitHub): original live Library APKs; owner-private Google Drive `JM Estate Cold Recovery` contains the unmodified CP17 anchor and `JM_M001_CP27_SLINGFALL_PRIVATE_COLD_DELTA.zip`. The private pack includes the source manifest with original separate `libfile_` carrier IDs, roles, SHA-256 pins, patch bytes, original CP25 code, CP27 code and offline readme.

**Bounded actual result (28 October 2026):** 13 live APKs total **363,104,095 bytes**; one full CP17 anchor **27,978,260 bytes**; 10 exact delta files together **597,171 bytes**; portable private delta pack **623,837 bytes**; cold representation **28,602,097 bytes**; conditional carriage difference **334,501,998 bytes**. All 13 reconstituted original bytes and ZIP CRCs passed locally, and independent downloaded external carrier bytes exactly matched their pinned source SHA-256; the independently restored external working set was compared 13/13 against exact originals. Original native Library identities retained unchanged. Account quota savings **zero measured**, owner-device APK install/signer trust not re-tested.

To use outside ChatGPT with Python and `zstd` CLI:

```sh
python3 agent-runtime/host-adapters/storage-admission/JM_M001_APK_LINEAGE_RESTORE_CP27.py --pack /private/JM_M001_CP27_SLINGFALL_PRIVATE_COLD_DELTA.zip --anchor /private/JM_SLINGFALL_CP17_SIX_TACTICS_FOLD_TEST.apk --output-dir /new/RESTORED_ALL_13
python3 agent-runtime/host-adapters/storage-admission/JM_M001_APK_LINEAGE_RESTORE_CP27_TESTS.py
```

Never equate same-file SHA with same delivery-role authority. The generated APKs are exact-byte recoveries, not proven replacements for existing owner-visible Library links or Play Store/install identity. No source overwrite, native file Trash operation, deletion, APK signature modification or quota-saving claim is authorized by CP27. Public CI exercises only synthetic fixtures and keeps every previous M001 test.


## CP28 — TIWIN four original source editions, lossless cold recovery

CP28 reuses the existing M001 CP25 whole-byte restoration engine. It does **not** replace the TIWIN FIND × SIGNAL app, its distinct version identity, original source-code editability, account database backups or native file links. It preserves the actual source ZIP bytes for TIWIN CP05 Live Pulse, CP06 Pager Receipts, CP07 owner-ready PWA candidate and CP08 engineering completion as four independently named versions.

**Exact owner-private proof, 28 October 2026:** 4 native ZIPs / **62,045,302 B** original carriage, all original SHA-256 and ZIP CRC PASS. Current CP08 23,208,037 B source retained whole; CP05–07 patches are 60,981 B + 74,260 B + 132,184 B. A private owner-only recovery pack with manifest, patches, offline instructions, unchanged CP25 restorer and CP28 script is **235,289 B**, SHA-256 `14818669fb40b584bd84192fe1fb5294d7cf8113bb9c16fbb265c4b455dde12e`.

**Cold representation = 23,443,326 B**, or **38,601,976 B conditional less carriage**, if all four full packages would otherwise be held in a second cold store. Zero native Library files retired; zero account quota reduction measured or claimed. Distinct source and direct-download purposes are protected.

Independent external contact: unchanged CP08 full anchor and private 235,289 B delta pack both uploaded to existing owner-only Google Drive `JM Estate Cold Recovery`, re-downloaded as exact provider bytes **2/2 SHA PASS**, and reconstructed **4/4 full original ZIPs byte-exact**, including ZIP-member CRC. Only the generic restorer, synthetic 40-case adversarial tests and this README are in the public editable GitHub repo; private ZIP source data/manifests are never published.

Offline run with `zstd` and Python 3.10+:

```sh
python3 agent-runtime/host-adapters/storage-admission/JM_M001_PURPOSE_CHAIN_RESTORE_CP28.py --pack /private/JM_M001_CP28_TIWIN_FOUR_EDITIONS_PRIVATE_COLD_DELTA.zip --anchor /private/TIWIN_CP08_ENGINEERING_COMPLETION_FULL_SOURCE.zip --output-dir /new/TIWIN_CP05_CP08_RESTORED
python3 agent-runtime/host-adapters/storage-admission/JM_M001_PURPOSE_CHAIN_RESTORE_CP28_TESTS.py
```

New full-output directory only. All four native `libfile_` purposes remain distinct, and no native write/retirement permission is inferred. No public TIWIN deployment, physical Android installation or fresh app functional run is claimed by this storage test.


## CP29 — exact Visual Creation original source and processing-intake recovery

This is a **read-only M001 recipient**, not another Visual Creation studio or archive authority. Its 7 separately named original Library ZIPs are CP07, CP08, CP09, CP17, CP18, original processing intake V1 and expanded processing intake V2. Existing CP18 original full archive already embeds exact whole-ZIP copies of CP07, CP08, CP09 and CP17 (independent full SHA-256 match). V2 retains 34 exact-member identities from V1 and a `zstd --patch-from` delta recovers the entire *original zipped* V1 binary in 28,966 bytes. **Same bytes within a larger source is an independent recovery path, not native-link retirement authority.**

**Authentic evidence (28 October 2026):** 7 original native source releases **96,878,664 bytes**, **391/391 original ZIP members CRC PASS**. Two separate unmodified full anchors: CP18 **33,701,970 bytes**, processing intake V2 **31,354,499 bytes**. One 5-member PRIVATE recovery pack **23,024 bytes**, SHA-256 `fdf7068d99251555074b415abaa032ea6d1630cd12324160c8a528ec943a6600`. Complete cold representation **65,079,493 bytes**, or **31,799,171 bytes conditional less carriage** than storing all seven full release ZIPs in that tier. **Actual ChatGPT Library quota saving = 0 bytes measured; all 7 originals KEEP.**

CP29 private pack contains source pins, the 28,966-byte V2→V1 patch, offline README, generic CP29 restorer and protected existing CP25 exact-patch restorer. Private original bytes and full per-native-ID source manifest are NOT placed in GitHub. The three provider files are in existing owner-only Google Drive `JM Estate Cold Recovery`. Fresh independent full raw Google Drive readback 3/3 original SHA and byte length PASS; extracting the CP29 restorer from **downloaded** private pack reconstructed 7/7 exact original full ZIP binaries and 391/391 member checks PASS. This was independently compared with separately materialized live native Library originals.

Public source: `JM_M001_VISUAL_LINEAGE_RESTORE_CP29.py`, `JM_M001_VISUAL_LINEAGE_RESTORE_CP29_TESTS.py`, and this existing M001 CI step. CP29 inherits CP25 directly; no new compressor, registry, source-engine replacement or public/private-data exposure. Synthetic 26-case test suite exercises full 7-output byte identity, missing/native-role refusal, changed hashes, forged retirement, unsafe filenames/nested paths, malformed/corrupted private packs, changed anchors, symlinks, no-overwrite and zero quota claim.

Use on an owner-controlled laptop with `zstd` CLI and Python 3.10+, with the CP29 script adjacent to the existing CP25 source:

```sh
python3 JM_M001_VISUAL_LINEAGE_RESTORE_CP29.py --pack JM_M001_CP29_VISUAL_CREATION_COLD_RECOVERY_PRIVATE.zip --cp18 JM_VISUAL_CREATION_CP18_PRIVATE_SOURCE_AND_RUNNABLES.zip --v2 JM_VISUAL_CREATION_WHOLE_MATERIAL_PROCESSING_INTAKE_V2_2026-10-27.zip --output-dir NEW_VISUAL_SEVEN
```

This recovery test does NOT certify current owner-device visuals, remote deployment, browser writeback, public publishing, or source equivalence between independent source families. No source, direct native Library URL, CP18 lineage/CP19 private host or original media is retired.
