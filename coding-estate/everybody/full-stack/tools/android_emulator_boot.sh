#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${JM_AVD_NAME:-jm_api35_runtime}"
SYSTEM_IMAGE="${JM_SYSTEM_IMAGE:-system-images;android-35;google_apis;x86_64}"
LOG_PATH="${JM_EMULATOR_LOG:-build/android-emulator.log}"
PID_PATH="${JM_EMULATOR_PID:-build/android-emulator.pid}"
ADB_REGISTER_ATTEMPTS="${JM_ADB_REGISTER_ATTEMPTS:-60}"
BOOT_ATTEMPTS="${JM_BOOT_ATTEMPTS:-120}"
mkdir -p "$(dirname "$LOG_PATH")" "$(dirname "$PID_PATH")"

command -v avdmanager >/dev/null
command -v adb >/dev/null
test -x "$ANDROID_HOME/emulator/emulator"

diagnose() {
  echo "== JM emulator process ==" >&2
  if [[ -f "$PID_PATH" ]]; then
    emulator_pid="$(cat "$PID_PATH")"
    ps -fp "$emulator_pid" >&2 || true
  else
    echo "no emulator PID receipt" >&2
  fi
  echo "== JM adb devices ==" >&2
  timeout 10 adb devices -l >&2 || true
  echo "== JM emulator log tail ==" >&2
  tail -n 400 "$LOG_PATH" >&2 || true
}

on_exit() {
  status=$?
  if [[ "$status" -ne 0 ]]; then
    diagnose
  fi
}
trap on_exit EXIT

if [[ -e /dev/kvm ]]; then
  sudo chmod 666 /dev/kvm
  ACCELERATION=("-accel" "on")
else
  ACCELERATION=("-accel" "off")
fi

echo no | avdmanager create avd \
  --force \
  --name "$AVD_NAME" \
  --package "$SYSTEM_IMAGE"

nohup "$ANDROID_HOME/emulator/emulator" \
  -avd "$AVD_NAME" \
  -no-window \
  -no-audio \
  -no-boot-anim \
  -no-snapshot \
  -no-snapshot-save \
  -no-metrics \
  -wipe-data \
  -camera-back none \
  -camera-front none \
  -gpu swiftshader_indirect \
  -cores 2 \
  -memory 2048 \
  "${ACCELERATION[@]}" \
  >"$LOG_PATH" 2>&1 &
emulator_pid=$!
echo "$emulator_pid" > "$PID_PATH"

echo "JM emulator PID: $emulator_pid"
echo "JM emulator acceleration: ${ACCELERATION[*]}"

registered=0
for attempt in $(seq 1 "$ADB_REGISTER_ATTEMPTS"); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    echo "Android emulator exited before ADB registration" >&2
    exit 1
  fi
  if timeout 5 adb get-state 2>/dev/null | grep -qx 'device'; then
    registered=1
    echo "JM_ANDROID_EMULATOR_ADB_REGISTER_PASS:$attempt"
    break
  fi
  sleep 5
done

if [[ "$registered" != "1" ]]; then
  echo "Android emulator failed to register as an ADB device" >&2
  exit 1
fi

booted=0
for attempt in $(seq 1 "$BOOT_ATTEMPTS"); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    echo "Android emulator exited before sys.boot_completed=1" >&2
    exit 1
  fi
  state="$(timeout 10 adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [[ "$state" == "1" ]]; then
    booted=1
    echo "JM_ANDROID_EMULATOR_SYSTEM_BOOT_PASS:$attempt"
    break
  fi
  sleep 5
done

if [[ "$booted" != "1" ]]; then
  echo "Android emulator failed to reach sys.boot_completed=1" >&2
  exit 1
fi

timeout 30 adb shell settings put global window_animation_scale 0
timeout 30 adb shell settings put global transition_animation_scale 0
timeout 30 adb shell settings put global animator_duration_scale 0
timeout 30 adb shell input keyevent 82 || true
timeout 30 adb shell wm dismiss-keyguard || true

timeout 30 adb shell getprop ro.build.version.sdk | tr -d '\r' | grep -x '35'
timeout 30 adb shell getprop ro.product.cpu.abi
timeout 30 adb devices -l

trap - EXIT
echo "JM_ANDROID_EMULATOR_API35_BOOT_PASS:$AVD_NAME"
