#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor 3510c192320e40b5490681c6fc8d3a92ba13a3d6 HEAD
test -f systems/routeos-kernel-jm-native-v0.6A/proof/FREEZE_LOCK_ANCHOR_v0.6A.md

V02=systems/routeos-kernel-jm-native-v0.2A
V03=systems/routeos-kernel-jm-native-v0.3A
V04=systems/routeos-kernel-jm-native-v0.4A
V05=systems/routeos-kernel-jm-native-v0.5A
V06=systems/routeos-kernel-jm-native-v0.6A
V07=systems/routeos-kernel-jm-native-v0.7A

python3 "$V02/tools/jmroutec.py" "$V02/source/routeos_kernel.jmroute" --out-dir "$V02/generated" --check
python3 -m unittest discover -s "$V02/tests" -v
python3 "$V03/tools/permissiongatec.py" "$V03/source/permissiongate.jmroute" --out-dir "$V03/generated" --check
python3 -m unittest discover -s "$V03/tests" -v
python3 "$V04/tools/routeschedulerc.py" "$V04/source/routescheduler.jmroute" --out-dir "$V04/generated" --check
python3 -m unittest discover -s "$V04/tests" -v
python3 "$V05/tools/memorybodyc.py" "$V05/source/memorybody.jmroute" --out-dir "$V05/generated" --check
python3 -m unittest discover -s "$V05/tests" -v
python3 "$V06/tools/faultrecoveryc.py" "$V06/source/faulthold_recoverybody.jmroute" --out-dir "$V06/generated" --check
python3 -m unittest discover -s "$V06/tests" -v
python3 "$V07/tools/ignitionbodyc.py" "$V07/source/ignitionbody.jmroute" --out-dir "$V07/generated" --check
python3 -m unittest discover -s "$V07/tests" -v

mkdir -p .routeos-v07a
base64 -d systems/routeos-kernel-convergence-v0.1A/routeos-kernel-v0.1A-ci-source.tar.gz.b64 > .routeos-v07a/source.tar.gz
echo 'b54dc630332255667e099ce2bafb00e3b927b5b5ff966e6e0898bbb2e2c54654  .routeos-v07a/source.tar.gz' | sha256sum -c -
tar -xzf .routeos-v07a/source.tar.gz -C .routeos-v07a
KERNEL=.routeos-v07a/routeos-kernel-v0.1A

python3 "$V02/tools/integrate_boot.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --authority-header "$V02/generated/routeos_authority.h" --receipt .routeos-v07a/V02_BOOT_INTEGRATION_RECEIPT.json
python3 "$V03/tools/integrate_permissiongate.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V03/generated/permissiongate_office.inc" --receipt .routeos-v07a/V03_PERMISSIONGATE_INTEGRATION_RECEIPT.json
python3 "$V04/tools/integrate_routescheduler.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V04/generated/routescheduler_office.inc" --receipt .routeos-v07a/V04_ROUTESCHEDULER_INTEGRATION_RECEIPT.json
python3 "$V05/tools/integrate_memorybody.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V05/generated/memorybody_office.inc" --receipt .routeos-v07a/V05_MEMORYBODY_INTEGRATION_RECEIPT.json
python3 "$V06/tools/integrate_faultrecovery.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V06/generated/faulthold_recoverybody_office.inc" --receipt .routeos-v07a/V06_FAULTRECOVERY_INTEGRATION_RECEIPT.json
python3 "$V07/tools/integrate_ignitionbody.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V07/generated/ignitionbody_office.inc" --receipt .routeos-v07a/IGNITIONBODY_INTEGRATION_RECEIPT.json

test "$(grep -Fc 'static void jm_generated_ignitionbody' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
test "$(grep -Fc 'jm_generated_ignitionbody(magic, mb_info);' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
