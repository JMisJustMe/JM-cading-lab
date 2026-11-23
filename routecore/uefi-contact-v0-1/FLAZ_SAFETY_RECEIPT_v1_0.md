# JM RouteCore — FLAZ SAFETY RECEIPT v1.0

**State:** FROZEN · LOCKED · ANCHORED · SAFETY-BOUND  
**Checkpoint:** 2026-09-30 11:57 Europe/London  
**Scope:** emulator-proven UEFI observable descendant + owner-device physical-contact gate preparation.

## Exact frozen identities

- Pre-Boot v1.0 package SHA-256: `d8e9da7726bc8d71b40d7a90547c4bacd34fe71445ef91c47fd3297ef391311c`
- Frozen BIOS disk SHA-256: `17dc85deef1bf1e2c57e29d45f764a47d9ae60553c290f6e4bf5ccdfd7216e80`
- Frozen silent UEFI target SHA-256: `deb0f6396cbe414d35b5fa507cbd5e925ecc7c65ac07af1d0b703a81f64e1882`
- Exact physical-contact witness SHA-256: `c2adfd0262615c9d228963895b0e3b1fd09dcc6baef2cb4eac2f1e444d7b099c`
- Witness source SHA-256: `c21b5fb92c9c937a5244dd0f1bbad0c485252ee0e201996ae4a249102d34a6f7`
- Successful emulator proof run: `36679516899` / #23
- Emulator proof head: `0a2d93516cec53de59c5253e0cf8494d418bee80`
- Actions artifact SHA-256: `54cd553676fdc1eca46278a9ac9c325ed8034b5b791bec329b6106a6053e14ab`
- Pre-FLAZ gate ZIP SHA-256: `01b395ab37a36b5d4c5ef92da27df25956c9b17ab9a7c65b90fd2beb3faf5cf0`
- **FLAZ SAFETY package SHA-256:** `0afecb07695542cfece1c33aa594e3f9eabb6eca9541c1fc913f28511879bb5f`

The FLAZ package reopened successfully and verified 15 manifested files. The EFI witness remained byte-identical.

## Earned

- observable x86-64 EFI descendant executed under QEMU x86_64 + OVMF
- UEFI SimpleTextOut/framebuffer contact
- emulator-key → UEFI keyboard protocol contact
- safe-return hold
- exact executed CI EFI carried forward as the physical witness

## Still OPEN

- physical-machine execution
- physical keyboard contact
- exact frozen silent UEFI-target execution
- physical RouteCore kernel boot
- physical PIT/IRQ0
- physical keyboard IRQ1
- physical device-driver contact

## Safety lock

- Do not rebuild, patch, resign, or substitute the first-contact EFI witness.
- Spare removable USB only; no RouteCore sector writes or formatting of the Windows/BitLocker internal disk.
- First pass preserves Secure Boot, Secure Boot keys, BIOS firmware, TPM and BitLocker state.
- Firmware rejection is valid evidence and must not trigger safety weakening merely to force a pass.
- No returned physical marker = no physical claim.
- Firmware keyboard protocol contact ≠ IRQ1/native driver contact.
- PR #269 remains draft until owner-device physical evidence earns any next crown.

**Keeper:** SAFETY STATE MUST NOT BE WEAKENED TO FORCE A PASS.
