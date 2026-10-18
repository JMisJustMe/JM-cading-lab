# JM Cross-Location Storage Census & Reconciler v0.1

A read-only bridge for comparing permissioned storage manifests from phones, laptops, external drives and exported cloud locations as one Estate census.

## Why this body exists

JM Estate Librarian, File Grabber and FLL BenefitMerge already provide intake, hashing, manifests, version-family inference and receipts. This body connects their outputs across locations rather than restarting those engines.

## Core workflow

1. Name the source and device type.
2. Select a permissioned folder or import an existing manifest/checkpoint.
3. Choose inventory-only, candidate-exactness or exact-all hashing.
4. Export one source manifest per storage location.
5. Import the manifests together and reconcile exact duplicates, one-observed-location risks, missing hashes and body families.
6. Choose keepers manually and export the master audit and receipts.

## Safety boundary

- Source access is permissioned and read-only.
- No delete, move, rename, merge, overwrite or compression route exists.
- Exact-duplicate claims require matching full SHA-256 values.
- “Observed in one location” means one mounted manifest, not proof that no other copy exists elsewhere.
- Current-best findings are suggestions, never automatic crowns.

## Delivery state

- Direct-open one-body HTML: built and browser-tested.
- PWA source: built.
- Android source carrier: built.
- GitHub Actions APK build: supplied by this branch workflow.
- Physical Android install and field Ding: pending user-device proof.

## Donor lineage

JM Estate Librarian v0.4; JM File Grabber; FLL BenefitMerge; Current Best / Crown / Living Registers; BodyVault.
