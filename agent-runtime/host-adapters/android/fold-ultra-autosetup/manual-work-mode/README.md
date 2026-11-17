# JM ECOSTATE — Manual Work Mode CP01

**Source role:** additive executor entry for the existing JM Fold Ultra Home Lab. **Not** a new sovereign app, not a replacement for JM ON MODE, and not a ChatGPT background-agent implementation.

Press **ACTIVATE NOW** on the existing GroundZeroJM checkout to launch four bounded existing-source checks, headlessly, with durable per-job SHA-256 output hashes and exit codes. Open the app with `JM_WORK_MODE_OPEN.cmd` in `agent-runtime/host-adapters/android/fold-ultra-autosetup/` (the adjacent `tools/jm_work_mode.py` is used automatically). Or run `py -3 tools\\jm_work_mode.py gui` from that folder.

* The original Windows power plan, phone timeouts, screen sleep, app installation and Android defaults are **not touched**. The laptop must remain powered; ordinary OS sleep can pause work. Phones stay usable.
* No pre-set activation time: **manual only**. No arbitrary commands, shell mode, open ports, credentials, persistent AI agent, file deletion, deployment or repository push.
* Jobs currently: tracked Git changes, exact HEAD, JM default execution self-test and in-memory JM agent-runtime syntax validation. These are useful smoke checks, **not** autonomous feature work or a complete CI pass.
* State/receipts: `%LOCALAPPDATA%\\JM_ECOSTATE\\JM_WORK_MODE_CP01\\state.json` and `runs.jsonl`; no raw files archived.
* **STOP AFTER CURRENT JOB** politely stops between jobs. A second concurrent activation is held. A stale run lock from a killed worker is intentionally a HOLD requiring inspection, not automatic deletion.
* Optional CLI: `py -3 tools\\jm_work_mode.py start|stop|status|self-test`.

## Future guarded integration

A Fold8/OPPO home-screen button can invoke this only through a **proven authenticated command bridge**, such as separately existing JM Phone↔Laptop contact, with per-device consent, revocation, one-time command IDs and encrypted transport. It must not expose a local Python shell or insecure unauthenticated LAN listener. No phone-control claim is made by this code. Do not reuse the original ON MODE keep-awake pathway.

**Acceptance gates:** source syntax and structural self-test; isolated local mock checkout; exact GitHub commit; actual GroundZeroJM launch and receipts; optional physical button test. Each gate is independent. No original app/APK replacement or signing change.
