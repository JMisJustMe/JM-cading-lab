# Operator Guide

## Visual inspection

Open the generated `03_OBSERVATORY/index.html`. The top cards show boot health, structured event count, safe post-recovery calls, fault budget, ring capacity and source fingerprint. The operational route highlights new v2.0A offices.

## Boot locally

From the packaged Zionfolder:

```bash
bash 05_ADDONS/run-qemu.sh 01_RUNTIME/routeos-kernel-v2.0A.iso
```

## Debug locally

Install QEMU and GDB, then run:

```bash
bash 05_ADDONS/debug-gdb.sh \
  01_RUNTIME/routeos-kernel-v2.0A.elf \
  01_RUNTIME/routeos-kernel-v2.0A.iso
```

## Expected decisive receipts

- `OBSERVATORYCONTINUITYROUTE GENERATED v2.0A ... ACTIVE`
- `JMHEALTH checks=6 passed=6 state=PASS`
- `kind=FAULT body=2 vector=6`
- `kind=QUARANTINE body=2 vector=6`
- `kind=RECOVERY body=2 vector=6`
- `RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES`
- a later Body 1 `TRACE_READ` pass.

A missing or duplicated decisive receipt is a HOLD, not a partial pass.
