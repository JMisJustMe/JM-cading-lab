# FrameCarrier + InterruptEntry Operational Receipt — Construction Gate

- Frozen proof parent: `a05b26b3901460cfa5623cbb3063d961a9952214`
- Prior tested machine parent: `dfa52b8e42f2511eeb3082f14fc2eb0584843e27`
- JM source SHA-256: `50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914`
- Generated assembly SHA-256: `79e7171f56c84c135731eaa2bc069093b53d465b449a58a179f9ee65f042621e`
- Original `boot.S` SHA-256: `c2304e2a6d9a4e0e82b80f80a99fca959ff7296ae9b8964c0f0e21351c49afb9`
- Integrated `boot.S` preview SHA-256: `93f3372a30da7c3d0739504da807e123dfdde66a59e6cb84e13d514d7e9f4c69`
- Local source/compiler/assembler/integration tests: `6/6 PASS`
- Complete v0.9A kernel plus generated v1.0A assembly: `STATIC_VERIFY PASS`

Machine DING remains withheld until the QEMU workflow proves generated first-frame entry, generated interrupt entry, live system calls, timer scheduling, deliberate invalid-opcode containment and post-fault safe continuation in one trace.
