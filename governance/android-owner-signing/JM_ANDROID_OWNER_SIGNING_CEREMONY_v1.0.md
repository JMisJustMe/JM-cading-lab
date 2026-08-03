# JM ANDROID OWNER SIGNING CEREMONY v1.0

**Status:** MOUNTED PUBLIC-SAFE GOVERNANCE BODY

## Purpose

This body governs creation and use of a self-generated Android release signing identity for JM-owned applications.

The signing identity proves package-update continuity. It does not prove authorship of every source body, transfer ownership to a platform, or replace source, build, trace, Ding, device-contact, publication, licensing or commercial receipts.

## Core separation

```text
PUBLIC-SAFE GOVERNANCE BODY
≠
PRIVATE KEY MATERIAL
```

The protocol, package scope, certificate fingerprints, verification receipts and backup checks may be mounted in the Estate.

The following must never be committed, uploaded, pasted into chat, placed in a public artifact or included in an Estate package:

- `.jks` or `.keystore` files;
- keystore passwords;
- key passwords;
- recovery phrases or password-manager exports;
- private signing keys;
- unredacted terminal history containing secrets.

## Initial family scope

Working family name:

`JM_ROUTEOS_COMPASS_RELEASE_v1`

Working alias:

`jm-routeos-compass-release`

Initial package scope:

- `com.jmestate.estatecompass`
- `com.jmisjustme.routeos.gameestate`

This is a package-family key, not an automatic Estate-wide universal key. Expansion to other applications requires an explicit scope decision and receipt.

## Ceremony route

```text
SELECT SCOPE
→ CREATE KEYSTORE LOCALLY
→ RECORD PUBLIC CERTIFICATE FINGERPRINTS
→ CREATE TWO ENCRYPTED BACKUPS
→ TEST BACKUP RESTORE
→ SIGN ALIGNED APK
→ VERIFY CERTIFICATE AND APK SCHEMES
→ INSTALL ROUTEOS
→ INSTALL COMPASS
→ RUN PHYSICAL-CONTACT TEST
→ RECORD RECEIPT
→ DING
```

## Local generation template

Run locally with a trusted Java `keytool`. Allow the tool to prompt for passwords; do not place passwords directly in shell commands.

```bash
keytool -genkeypair -v \
  -keystore JM_ROUTEOS_COMPASS_RELEASE_v1.jks \
  -alias jm-routeos-compass-release \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=JM Estate, OU=RouteOS Compass, O=JM, L=Nottingham, ST=Nottinghamshire, C=GB"
```

## Public certificate receipt

After creation, record only public certificate information:

```bash
keytool -list -v \
  -keystore JM_ROUTEOS_COMPASS_RELEASE_v1.jks \
  -alias jm-routeos-compass-release
```

Public-safe fields:

- alias;
- creation date;
- certificate validity window;
- SHA-256 certificate fingerprint;
- SHA-1 certificate fingerprint where a platform specifically requires it;
- package scope;
- backup-check date.

## Signing route

Use the aligned unsigned APKs and Android `apksigner`. Passwords should be entered interactively or supplied through a secure local mechanism that does not enter source control or terminal history.

```bash
java -jar apksigner.jar sign \
  --ks JM_ROUTEOS_COMPASS_RELEASE_v1.jks \
  --ks-key-alias jm-routeos-compass-release \
  --out JM_ESTATE_COMPASS_ROUTEOS_DOORWAY_v2_2A_SIGNED.apk \
  JM_ESTATE_COMPASS_ROUTEOS_DOORWAY_v2_2A_UNSIGNED_ALIGNED.apk
```

```bash
java -jar apksigner.jar sign \
  --ks JM_ROUTEOS_COMPASS_RELEASE_v1.jks \
  --ks-key-alias jm-routeos-compass-release \
  --out JM_ROUTEOS_ESTATE_SHELF_v2_1A_SIGNED.apk \
  JM_ROUTEOS_ESTATE_SHELF_v2_1A_UNSIGNED_ALIGNED.apk
```

## Verification route

```bash
java -jar apksigner.jar verify \
  --verbose \
  --print-certs \
  JM_ESTATE_COMPASS_ROUTEOS_DOORWAY_v2_2A_SIGNED.apk
```

```bash
java -jar apksigner.jar verify \
  --verbose \
  --print-certs \
  JM_ROUTEOS_ESTATE_SHELF_v2_1A_SIGNED.apk
```

The certificate SHA-256 fingerprint shown for both APKs must match the recorded family-key fingerprint.

## Backup law

Minimum acceptable backup state:

1. primary encrypted local copy;
2. second encrypted copy on a physically separate device or medium;
3. passwords stored separately from the keystore;
4. a tested restore route;
5. no public-cloud copy unless independently encrypted before upload;
6. no key material inside GitHub, ChatGPT, build artifacts or public Estate packages.

A backup that has never been restored is **UNPROVEN**.

## Physical-contact proof

After signing:

1. verify both APKs;
2. install RouteOS first;
3. install Compass second;
4. confirm the native `ROUTEOS` control appears;
5. open the Estate Shelf;
6. open Five Crowns;
7. open the Sovereign Estate Router;
8. test return navigation;
9. import, replace, restore and remove a private Compass body;
10. record Android version, device model, APK hashes, certificate SHA-256 fingerprint and pass/fail results.

## Claim statuses

- **KNOWN:** the protocol and public-safe boundaries are mounted.
- **UNKNOWN:** the owner key does not exist until generated locally.
- **LIMIT:** no assistant, repository or public artifact can create or preserve the private key safely on the owner’s behalf.
- **DING CONDITION:** local key generation, public fingerprint capture, two-backup proof, signing verification and physical-device contact all pass.

## Mounting law

The signing ceremony body is mounted.

The actual owner key is deliberately **not mounted**. Only its public certificate identity and proof receipts may enter the Estate.
