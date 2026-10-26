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
