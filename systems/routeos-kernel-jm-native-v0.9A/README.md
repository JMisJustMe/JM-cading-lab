# RouteOS Kernel JM-Native v0.9A — BodyRegistry + UserBoundary

Frozen parent: `e25f338d0d0025bdf9d00d502a832702082eda71`

This version generates two coupled C-level offices from one JM source:

- **BodyRegistry** — CPU-frame field order, body-state model, body storage, current-body state and tick state.
- **UserBoundary** — user-page permission propagation, CR3 reload, user-code placement, stack clearing and initial CPL3 frames for User Bodies 1 and 2.

The final assembly frame-entry/`iretq` carrier remains outside the claim.

## Authority hashes

- JM source: `c84db3d5aaad07e90b45d4ac84216cd9c60c0fbc22d25a00caeccb6354bda99f`
- BodyRegistry carrier: `a5d941be03a48aaf4ec3466d99ac139e86c2fc6864304901b15a4a01d757bfbd`
- UserBoundary carrier: `b8daecdc4aca8d1e2ee389a97b49b5bafe10bed97548c43d8f2d896f30ea9f49`
- Integrated source preview: `4f1719e711eadb451bfab7f19253cbc0a1335d81c3a2a68e4fd07ccbbc9e91bb`

## Required machine order

`IgnitionBody → authority → MemoryBody → DescriptorBody → InterruptRoute → BodyRegistry → UserBoundary → registry receipt → RouteScheduler → PermissionGate → FaultHold → RecoveryBody`.

A PASS proves ten named JM-generated operational offices. It does not prove generated assembly entry, page-table storage construction, ISR stubs or user-code bytes.
