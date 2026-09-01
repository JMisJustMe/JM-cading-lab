#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor 313a66c461a55c7aebe24807254d8ef263101661 HEAD
test -f systems/routeos-kernel-jm-native-v0.7A/proof/FREEZE_LOCK_ANCHOR_v0.7A.md

V02=systems/routeos-kernel-jm-native-v0.2A
V03=systems/routeos-kernel-jm-native-v0.3A
V04=systems/routeos-kernel-jm-native-v0.4A
V05=systems/routeos-kernel-jm-native-v0.5A
V06=systems/routeos-kernel-jm-native-v0.6A
V07=systems/routeos-kernel-jm-native-v0.7A
V08=systems/routeos-kernel-jm-native-v0.8A

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
python3 "$V08/tools/descriptorinterruptc.py" "$V08/source/descriptor_interrupt.jmroute" --out-dir "$V08/generated" --check
python3 -m unittest discover -s "$V08/tests" -v

mkdir -p .routeos-v08a
base64 -d systems/routeos-kernel-convergence-v0.1A/routeos-kernel-v0.1A-ci-source.tar.gz.b64 > .routeos-v08a/source.tar.gz
echo 'b54dc630332255667e099ce2bafb00e3b927b5b5ff966e6e0898bbb2e2c54654  .routeos-v08a/source.tar.gz' | sha256sum -c -
tar -xzf .routeos-v08a/source.tar.gz -C .routeos-v08a
KERNEL=.routeos-v08a/routeos-kernel-v0.1A

python3 "$V02/tools/integrate_boot.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --authority-header "$V02/generated/routeos_authority.h" --receipt .routeos-v08a/V02_BOOT_INTEGRATION_RECEIPT.json
python3 "$V03/tools/integrate_permissiongate.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V03/generated/permissiongate_office.inc" --receipt .routeos-v08a/V03_PERMISSIONGATE_INTEGRATION_RECEIPT.json
python3 "$V04/tools/integrate_routescheduler.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V04/generated/routescheduler_office.inc" --receipt .routeos-v08a/V04_ROUTESCHEDULER_INTEGRATION_RECEIPT.json
python3 "$V05/tools/integrate_memorybody.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V05/generated/memorybody_office.inc" --receipt .routeos-v08a/V05_MEMORYBODY_INTEGRATION_RECEIPT.json
python3 "$V06/tools/integrate_faultrecovery.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V06/generated/faulthold_recoverybody_office.inc" --receipt .routeos-v08a/V06_FAULTRECOVERY_INTEGRATION_RECEIPT.json
python3 "$V07/tools/integrate_ignitionbody.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V07/generated/ignitionbody_office.inc" --receipt .routeos-v08a/V07_IGNITIONBODY_INTEGRATION_RECEIPT.json
python3 "$V08/tools/integrate_descriptorinterrupt.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --office "$V08/generated/descriptor_interrupt_office.inc" --receipt .routeos-v08a/DESCRIPTOR_INTERRUPT_INTEGRATION_RECEIPT.json

test "$(grep -Fc 'static void gdt_install(void)' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
test "$(grep -Fc 'static void idt_install(void)' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
test "$(grep -Fc 'static void pic_pit_install(void)' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
! grep -F 'uint16_t divisor = 1193182U / 100U;' "$KERNEL/kernel/routeos_kernel.c"
