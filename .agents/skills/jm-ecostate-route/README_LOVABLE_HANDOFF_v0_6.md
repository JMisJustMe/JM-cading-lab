# JM Knowledge Contact v0.6 — Integration VISGUIDE (draft, additive)

**Protected heads**: JM v0.5 source→candidate→source replay→existing Python/Node runtime remains sovereign. External Lovable agent app at its pinned commit remains unchanged. This is a **bridge**, not a replacement implementation or a promoted skill.

The exported Lovable Review JSON alone does **not** contain the original text. Always supply the exact original bytes alongside it; otherwise independent source replay is impossible.

## Operational contact

1. In the signed-in Lovable Testbench, use **Capture** with original text, **Search**, and create a **HELD Review candidate**.
2. Export Review **JSON** and separately save the **exact original transcript** to a UTF-8 .txt file. Do not copy private files to public GitHub.
3. From a checkout of the *draft PR* run:
   
   ```sh
   python3 .agents/skills/jm-ecostate-route/jm_lovable_handoff.py \
     --source /path/to/source.txt \
     --lovable-json /path/to/review.json \
     --query 'recover ancestors' \
     --out /path/to/new-run \
     --route-existing
   ```
   
   Omit `--route-existing` only when sovereign JM Python/Node runtimes are not present. The script does not infer absent hosts.
4. `new-run/HANDOFF_RECEIPT.json` is metadata-only; `new-run/held_candidate/` includes *sensitive quotations*, so keep it private. The candidate stays HELD, never installed.
5. To re-query later, use `jm_knowledge_query.py` with original source and candidate. `jm_knowledge_assurance.py` independently rechecks source before any new retrieval.

## Tested v0.6 contract
- Exact original UTF-8 SHA256 must match browser-exported `sourceSha256`. Stale hash, edit, byte change or substituted file fails.
- Every selected citation must match exact original line text and reported `[UNTRUSTED DATA]` marker. Changed quotation fails.
- `state=HELD`, `autoInstall=false`, ordered citations and quarantined-line metadata are required.
- A valid UI review does not authorize the source's instructions, guarantee safety, validate their truth, or grant current-head status.
- The bridge invokes unchanged v0.5 intake, provenance replay, lexical query, and optionally existing JM dual-language runtime gate.
- Independent Lovable skill *discovery*, private-authenticated Playwright access, trained neural attention, hardware speech quality and actual recipient improvement are still OPEN.

Run the source tests via `python3 -m unittest discover -s .agents/skills/jm-ecostate-route/tests -p 'test_*.py'`.
Open `host-trials/lovable-v0_1/JM_KNOWLEDGE_VISGUIDE_v0_6_ONEBODY.html` for an offline interactive visual guide and browser-only JSON/source preflight. The VISGUIDE does not execute Python, Node, agent contact or promotion.

**FLAZ does not merge; NO DING, NO CLAIM.**

## Consolidated master and distributable source

The single orientation/restore point is `00_START_HERE_JM_KNOWLEDGE_CONTACT_MASTER.md` in this directory. The corresponding protected checkpoints are `FLAZ_KNOWLEDGE_CONTACT_CP_2026-10-19.md` and `FLAZ_BLIND_AGENT_CONTACT_CP7_2026-10-19.md`. Together with this folder's executable modules, tests, fixtures, Lovable original source shadow, VISGUIDE and bounded CI, these form one unified **source kit**, not another agent or new acceptance phase. CI's `jm-knowledge-v05-public-safe-source-kit` artifact collects this entire project-local skill folder for offline distribution. Python/Node JM sovereign routing still requires a full checkout of the original repository; the source kit alone can demonstrate its local document intake/replay/query tests. Do not promote a HELD candidate merely because it is bundled.
