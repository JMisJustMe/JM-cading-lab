# OPEN FIRST — RouteOS Kernel Observatory v2.0A

1. Open `apps/routeos-kernel-observatory/index.html` for the phone/laptop visual surface.
2. Read `README.md` for the complete body.
3. Read `CLAIM_BOUNDARY.md` before applying a crown.
4. Run `python3 -m unittest discover -s systems/routeos-kernel-jm-native-v2.0A/tests -v`.
5. The CI workflow reconstructs the complete v1.9A stack, mounts v2.0A, rebuilds the ELF/ISO, boots QEMU, decodes the trace, renders the observatory and packages the Zionfolder.

**Do not merge or freeze merely because the source-level tests pass. Machine proof and frozen-head revalidation remain separate gates.**
