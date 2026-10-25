# JM M001 — Storage Steward carrier admission adapter

**Identity:** A thin read-only host plug that inherits the existing JM storage/recovery and Build Mesh governing laws. It is not a new sovereign coding body, not a replacement for the M001 Residency Transfer Gate, and not a source authority.

**Run:** `python3 JM_M001_Carrier_Admission_Gate_v0_1.py --candidate NEW.zip --keeper ESTATE_HOUSE.zip`

**Return schema:** `JM.M001.CarrierAdmission/0.1`. States: `SAME_BYTES_ROLE_HOLD` (the exact payload exists in the keeper; owner direct-access/role release still required), `DISTINCT_BYTES` (preserve real variation), `HOLD_INVALID` (do not admit or retire).

**Test:** `python3 JM_M001_Carrier_Admission_Gate_v0_1.py --self-test` runs seven synthetic, fail-closed checks. GitHub Actions runs those checks only. It does not contact the private Library and cannot establish real-carrier residency, authorise Trash, measure ChatGPT quota or report Fold contact.

**Source boundary:** The original JM M001 CP16 ContactGate, typed Mesh Contact Runner, private carrier hashes/IDs/receipts and the Library evidence ledger stay in their original separate private authority. No private source bytes are committed to this public repository. Work can pass local files from existing owner custody when authorised. Future build workflows may invoke this adapter before proposing a redundant upload, but no existing build pipeline is automatically intercepted by this addition.

**Actual JM Closure & Handoff PACKAGE-stage contact (draft branch):** The existing `scripts/jm_build_closure.py` accepts optional `--admission-candidate` and `--admission-keeper` **only alongside `--stage PACKAGE --state PASS`**. When supplied, it directly executes this same admission organ before changing the closure state. `SAME_BYTES_ROLE_HOLD` and `HOLD_INVALID` prevent PACKAGE PASS, with the original ledger still OPEN; `DISTINCT_BYTES` may pass to the existing separate evidence check but cannot alone grant package, upload, owner approval, or retirement authority. With no admission flags, pre-existing closure behaviour is unchanged. Real private user carriers are never fetched in GitHub CI.

Example (local files and independent evidence; no uploading):

```bash
python3 scripts/jm_build_closure.py \
  --state-file /path/to/existing/closure.json \
  --stage PACKAGE --state PASS \
  --evidence "native:independently-verified-package-receipt" \
  --admission-candidate /path/to/proposed.zip \
  --admission-keeper /path/to/existing-keeper.zip
```

**Integrated test:** `.github/workflows/jm-build-closure-handoff.yml` executes real CLI transitions on synthetic valid, invalid and duplicate ZIPs: three false PASS states blocked before ledger mutation, and distinct package + independent evidence enters PACKAGE while FREEZE remains OPEN. The generic synthetic self-test is separate in `.github/workflows/jm-m001-carrier-admission.yml`. Neither route intercepts every producer's uploads automatically. New build owners must opt into the PACKAGE guard when the delivery has a known keeper.

**Route:** proposed delivery + retained house → local byte/hash/CRC contact → typed decision → normal closure evidence gate → role/owner gate → separately authorised upload or reuse. No deletion or account quota claim in this adapter.

**Standard:** recover before rebuild; body ≠ carrier ≠ route ≠ seat; no Ding without a consequence; integration ≠ replacement.


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
