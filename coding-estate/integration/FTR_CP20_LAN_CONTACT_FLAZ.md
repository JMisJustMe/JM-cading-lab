# JM FTR CP20 — LAN contact and original-source custody (candidate)

**Basis:** CP19 source `020829ce3791f283fb941edb2b15df61bcbeda86`, draft PR #642. CP09 original, CP18/CP19 game runtime, keyboard, touch, gamepad, genuine JM GameCore and gameplay rules untouched. No new game, wrapper, gameplay control, duplicate game files, or claimed native Gardles integration.

**What changed:** tiny, opt-in Python source-only transport `coding-estate/integration/ftr-cp20-lan-contact.py`. It serves only original `ftr-first-person-v0.5.1`, the R1 carrier and the five exact import-chain JM native donor files. Prevents folder listing, rejects other paths, no TLS claims or permanent firewall modifications. Default binds **localhost**, NOT a public host; owner must deliberately supply a LAN IP for physical-phone tests. The server is a temporary carrier, not a game authority or replacement for true device deployment.

## Reproduce independently outside ChatGPT

From the repo root, on Windows PowerShell (Python installed):

```powershell
python coding-estate/integration/ftr-cp20-lan-contact.py --host 127.0.0.1 --port 8765
```

For owner-approved local-network phone testing, replace `127.0.0.1` with the laptop's current Wi-Fi IPv4 address (`Get-NetIPAddress -AddressFamily IPv4`). Join the phone to the same reachable private LAN, and open the exact URL printed by the launcher in its browser. A Windows **Public** network profile may block inbound access: do not silently change firewall/network settings. The LAN IP can change. Exit with Ctrl+C. HTTP private-LAN browser access is generally **not** a secure context; offline service worker/PWA installation is **NOT** proven or promised.

## GroundZeroJM observed LAN smoke, 30 October 2026

- First live source check: `10.15.75.13:8765` original source response HTTP **200**; Microsoft Edge mobile emulation rendered the original active FTR game with **7** original enemies, visible TRACE and original start. 23/23 loaded resources, zero browser JS errors.
- Source-restriction negative test: unrelated repository path and a different game path both returned HTTP **403**. Tight initial scope revealed authentic JM donor dependency failures; those were **corrected**, not mocked or replaced. Final scope includes two source game directories and five exact JM donor import files; final independent Edge LAN smoke again loaded **23/23** resources, **0** HTTP failures, **0** page errors, original game started, **7** enemies active.
- This is **one-laptop LAN-IP browser execution**, **not proof** of an actual incoming connection from a second physical device. Network inbound acceptance and gameplay on Fold/Oppo remain **HOLD**. Original 63 CP19 browser assertions and CP18 full winning route are inherited evidence, not newly rerun by this transport pass.
- Current local Wi-Fi network profile was **Public**. No firewall permission, exposure beyond LAN, router port-forward, or public deployment was authorised or made. The live test server is session-dependent, not durable hosting.

## BIAT / FLAZ decision

**EARNED:** reproducible original-source LAN carrier; exact JM donor import graph accessible; no replacement; independent owner-editable server source; limited path admission and negative control. **HOLD:** phone-to-laptop inbound connection, actual owner manual play, phone portrait/landscape acceptance, physical HID/controller, native Gardles, owner visual approval, offline install, independent public release, merge. Never label this `PHYSICAL_DEVICE_PASS` without physical-device evidence.
