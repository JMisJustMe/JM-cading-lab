# RouteOS Kernel JM-Native v0.2A — First Authority

This body begins the post-Ding lane without modifying or weakening the frozen v0.1A proof.

## What changed

The kernel offices and proof obligations now have a compact JM-native source authority:

`source/routeos_kernel.jmroute`

`jmroutec.py` validates that authority and deterministically lowers it into:

- `generated/routeos_authority.h` — C/x86-64 carrier contract;
- `generated/routeos_authority.json` — canonical machine record;
- `proof/JM_SOURCE_AUTHORITY_RECEIPT.md` — human receipt.

## Governing law

**JM source is authoritative. C and JSON are generated carriers/receipts, not authorities.**

## Current claim boundary

This is the first source-authority gate. It proves deterministic JM-source lowering and preservation of every completed hard-body office/requirement. It does **not yet** claim that the generated header is compiled into the booting v0.1A kernel. That is the next proof gate.

## Local proof

```bash
python3 tools/jmroutec.py source/routeos_kernel.jmroute --out-dir generated --check
python3 -m unittest discover -s tests -v
```
