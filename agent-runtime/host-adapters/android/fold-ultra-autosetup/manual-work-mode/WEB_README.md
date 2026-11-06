# JM Work Mode CP02 · Chat-independent local web controller

This is an **additive browser entrance** to the existing CP01 manual controller inside the JM Fold Ultra Home Lab source. It is not a new sovereign JM creation, not an always-on ChatGPT agent, and not a public website.

## What it actually does

Open **JM_WORK_MODE_WEB.cmd** from the Home Lab directory on GroundZeroJM. It runs `tools/jm_work_mode_web.py`, listens on **127.0.0.1:8766 only**, and opens the device browser to `http://127.0.0.1:8766/`. `ACTIVATE NOW` starts the four already-allowlisted offline code/test checks; `STOP AFTER CURRENT JOB` stops the queue between checks. Local receipts and status remain available without ChatGPT or this conversation.

The original `tools/jm_work_mode.py` remains the execution donor. Its source, phone screen settings, power plan and identities are not changed. Windows must be powered and connected to the local checkout. The laptop is free to lock its display; if it enters sleep, work will be suspended by Windows.

## Safety and boundaries

- Local-only web service: fails closed if asked to bind on any interface other than 127.0.0.1.
- A fresh per-launch CSRF secret protects activation/stop forms; each POST must have the exact same localhost Origin and Host. Cross-site or remote requests are rejected. No API keys are embedded in HTML or source.
- No internet-exposed listener, LAN pairing, cloud authentication, work publication, device unlock, package install, source merges, arbitrary shell commands, or secrets exported.
- Status is displayed directly from `%LOCALAPPDATA%\JM_ECOSTATE\JM_WORK_MODE_CP01\state.json`; job outcomes and SHA-256 output digests from `runs.jsonl`.
- The browser is a **real functional control surface**, but only on GroundZeroJM until an authorised secure phone tunnel is verified. A public bookmark to a page that simply opens ChatGPT would *not* meet the owner’s goal.
- A trusted ADB reverse tunnel could allow a connected Fold8/OPPO to use the laptop loopback dashboard without a public port; that requires a separate consented, physical device verification. Do not enable insecure 0.0.0.0 LAN binding as a shortcut.
- The four current checks are smoke tests, **not an hour of autonomous coding/reasoning**. Later job types require their own authorisation and live proof. Work and Automations are independent execution offices, not silently controlled by this prototype.

## Verified local fixture

- CP01 original queue: 5/5 tests PASS.
- CP02 web: 7/7 HTTP security and integration tests PASS, including a *real* detached queue reaching PASS and receipts on a temporary fixture repository.
- Source syntax PASS; no GroundZeroJM physical launch or Fold8/OPPO tap claimed.

## Handoff

Keep this beside the original Home Lab draft PR, append rather than replace. Configure a verified original `JM-cading-lab` checkout, test a real GroundZeroJM launch and status, and only then arrange an optional phone shortcut through an authenticated tunnel. Do not merge or publish without owner approval.

## CP03 — 6 November 2026 actual GroundZeroJM and independent CI

- GroundZeroJM Remote Desktop Commander identified the existing host online. An initial `Downloads/JM-cading-lab-main` archive was **not** a valid checkout. Bounded source search found no matching existing full checkout; an **original-repository** sparse Git working checkout (not another JM body or repository identity) was created at `C:\\Users\\theod\\Documents\\JM-cading-lab`, tracking `JMisJustMe/JM-cading-lab` branch `jm/manual-work-mode-cp01-20261106`.
- GroundZeroJM real Python 3.13 and Git on 6 November: **12/12** CP01+CP02 unit tests PASS; a real direct execution of the four existing smoke jobs reported **PASS 4/4**, session `da0a51d2e9ed4d8e`, no tracked file modification.
- GroundZeroJM actual local HTTP server started as background PID 9532 on **127.0.0.1:8766 only**: GET **200**, Activate and Stop forms present, listener address readback 127.0.0.1. A real authenticated same-origin local POST of the Activate form returned browser HTTP **200 after redirect**, and new session `cc2abad34f0e40f4` independently recorded **PASS 4/4** with zero failed jobs.
- CP03 additive `tools/jm_work_mode_launch.py` and modified `JM_WORK_MODE_WEB.cmd` now implement **manual safe reuse / start + open** of that same local door, without switching on any wake guardian. 15/15 portable tests PASS locally before GitHub push.
- The GitHub PR #783 remains **protected draft/unmerged**. CI run [42287638479](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/42287638479) against CP03 SHA `7b4ffa97a6c95ce26620382dee846571707cbdd3`: **Windows PASS and Ubuntu PASS**, including CP03 loopback/launcher tests and original JM execution self-test. This is CI/source proof, not physical CP03 launcher execution.
- **Access HOLD:** Remote Desktop Commander returned `monthly usage exhausted; tool calls paused; device remains connected and paired; do not retry or reconnect`. Therefore the physical laptop checkout remains at pre-CP03 SHA `014dad31d603e89ece8db80a7c0dc5d058202286`; **the new open-or-start launcher and any desktop shortcut were NOT installed or activated on GroundZeroJM**.
- No Fold8/OPPO browser button, signed remote tunnel, persistent phone/laptop pairing, auto-start task, public deployment, default-launcher role change or unrestricted coding agent was performed. The four existing jobs are bounded smoke checks. The local laptop server is an owner-controlled manual execution door while Windows and this process stay powered; there is no screen-awake dependency.
- **Next owner-device gate after remote access restores:** read checkout head and running process, fast-forward only if the existing checkout has no tracked changes, run CP03 unit tests and `jm_work_mode_launch.py --no-browser` to verify reuse of the running local server, create and physically test one explicitly labelled `JM Work Mode` manual shortcut only, then separately assess authenticated phone access. Do not resurrect `JM ON MODE` or auto-start the worker without consent.
