# JM CP11 — Independently pinned encrypted checkpoint on a distinct filesystem

**Source-only REVIEW descendant** of CP10. Original Cloud Contact server, CP06 whole-file state, CP08 X25519 recipient key, CP09 PostgreSQL and CP10 coordinated checkpoint remain intact and sovereign.

CP11 adds a recipient-neutral **storage transport**, not a new backup encryption system. It accepts only the already sealed CP10 combined file+Market PostgreSQL checkpoint and its independently trusted SHA-256. It checks the structural package identity; it does not decrypt or claim the recipient key has been provided to the device. No secrets are transferred.

The operator must explicitly select a pre-existing external mount directory that belongs to them (0700). CP11 rejects symlink paths, unsafe file links, existing conflicting destinations, unpinned or altered ciphertext, and **any mount whose device ID matches the source filesystem**. It writes one immutable checkpoint file with exclusive `wx`, file fsync and parent directory fsync, re-reads exact SHA-256 and size, and refuses overwrites. A separately invoked verification mode verifies the stored copy's hash and checkpoint structure. Source file is left unchanged.

CI uses `/tmp` and a *genuinely distinct* `/dev/shm` filesystem to prove the technical transfer and a brand-new Node process readback. CI tmpfs is short-lived and not remote, not an owner USB drive and not a durable off-site store. No actual user device, cloud account or storage bill has been touched. Real off-site, offline retention and owner-held private key require separate authorized device/provider setup and a real readback after reboot and media remount.

Example only — an owner must provide a real source and independently known digest, and choose an existing private directory on an actually mounted different device:

```
node external-device-custody.mjs publish /private/checkpoint.cp10.sealed /media/owner/secure_backup/ jm_64_lowercase_hex_digest_here
node external-device-custody.mjs verify /media/owner/secure_backup/JM_CP10_<id>_<sha>.sealed <sha>
```

For a real run use exact 64-hex SHA-256, not the sample placeholder. This code never mounts devices, makes backup destinations, authorizes payment, configures cloud providers or promotes a service. Any storage medium's physical ownership, independent control and actual ability to survive loss of the original host must be documented and tested on that medium. GitHub CI is evidence of *portable independent-filesystem copying only*.

**Next owner-control gates:** offsite medium or dedicated separate owned host; real private key storage disconnected from origin; full checkpoint readback; independent reconstitution of PostgreSQL and file state; explicitly injected server secrets; HTTPS, authenticated service routes, monitoring, rollback; then owner-device contact and separate production admission. Draft ancestors remain unmerged.
