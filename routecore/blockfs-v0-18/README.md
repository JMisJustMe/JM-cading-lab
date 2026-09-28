# JM RouteCore Native64 — BlockFS Bounded Crash / Rollback Recovery Gate v0.18

Parent: **BlockFS v0.17 multi-block runtime contact**, merged on main as `acd2dbcc02d6614cbe5bc2eeff7714f4e1b62299`.

## Purpose

Pressure ordering and recovery above the already-proved multi-block filesystem without reopening the carrier boundary.

v0.18 reserves BlockFS block 31 as a bounded recovery journal. An existing `long.bin` remains authoritative while a different 1200-byte replacement is staged into a separate three-block extent. Data is flushed first; then the staging bitmap and PREPARED journal are persisted and directly reread. Only after that returned evidence does the guest emit the crash-point marker. The host kills QEMU abruptly at that marker.

On reboot, mount detects the PREPARED journal before normal bitmap validation, verifies that the authoritative `long.bin` still matches the old metadata, zeros the staged extent, clears its allocation bits, clears the journal, and then mounts the prior valid state. The recovery court requires B/C/long Ring-3 verification and requires the final raw carrier SHA-256 to equal the exact pre-crash baseline SHA-256.

This is a **bounded deterministic rollback proof**, not a claim of a production journal or arbitrary crash-point recovery.

## Crown gate

`fresh v4 state → exact baseline hash → existing read verification → stage different 1200-byte extent → data flush → bitmap + PREPARED journal flush → direct backing verification → crash marker → host SIGKILL → raw PREPARED inspection → reboot detects journal → rollback staging → clear journal → old B/C/long verification → exact baseline raw hash restored`

**NO RETURNED RECOVERY, NO DING.**
