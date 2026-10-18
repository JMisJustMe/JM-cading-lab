# JM Book-to-Skill donor — current v0.2 contact face

**Purpose:** make the existing JM repository's authority & host-adapter stack discoverable as an optional portable Agent Skills face for Codex/Copilot/other compatible hosts, without a competing engine. This package is designed for an isolated branch and draft PR.

**Known existing authorities:** `AGENTS.md`, governance standards, Current-64 routing, sovereign agent runtime, universal host adapter tester. All remain in place and are **referenced**, not recopied.

**Original donor:** https://github.com/virgiliojr94/book-to-skill (format workflow ideas only, no code reuse).

**Public/privacy boundary:** does not upload original JM Library documents, credentials or private receipts. Only GitHub-public governance paths and new adapter text.

**Tests:** `python3 .agents/skills/jm-ecostate-route/tests/verify_skill.py`, existing JM universal conformance command, and manual agent probes A/B/C. CI checks static contract + existing local reference runtime, **not** autonomous Codex/Copilot discovery or owner-device consequence.

**Expected proof:** commit/PR readback can earn carrier-transport scope. Agent skill use remains HELD until host-specific trace; don't merge until reviewed.

## v0.3 maximal execution descendant (same branch; no new JM brain)

The project-local skill now provides `jm_skill_gate.py`, a **read-only contact face for the pre-existing JM sovereign Python and Node runtimes**. It verifies the same routing core, exact source digests, Current-64 12/52 accounting, and refuses to elevate a route candidate into current-head authority. Its deterministic receipt is **HELD** for valid routing or **BUGG** for drift, never a self-certified product Ding.

The additive CI checks the actual repository, runs an isolated adversarial Python test suite, calls both JM runtimes twice (known and unknown domain), rejects invented unknown-domain routes, invokes the existing universal host-adapter tester, and uploads machine-readable receipts as a GitHub Actions artifact. The same source-body precedence and protected ancestors remain unchanged. **Host discovery by an actual Codex/Copilot model, target-state change and owner-device contact are still OPEN.** See `SKILL.md`, `CONTACT_CONTRACT_v0_3.json` and `.github/workflows/jm-agent-skill-donor-contact-v02.yml`.
