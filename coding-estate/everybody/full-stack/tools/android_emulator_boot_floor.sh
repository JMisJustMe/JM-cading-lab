#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${JM_AVD_NAME:-jm_android_floor_runtime}"
SYSTEM_IMAGE="${JM_SYSTEM_IMAGE:?JM_SYSTEM_IMAGE must name the exact Android system image}"
EXPECTED_API="${JM_EXPECTED_API:?JM_EXPECTED_API must name the exact Android API floor}"
LOG_PATH="${JM_EMULATOR_LOG:-build/android-floor-emulator.log}"
PID_PATH="${JM_EMULATOR_PID:-build/android-floor-emulator.pid}"
ADB_REGISTER_ATTEMPTS="${JM_ADB_REGISTER_ATTEMPTS:-60}"
BOOT_ATTEMPTS="${JM_BOOT_ATTEMPTS:-120}"
AVD_ROOT="${JM_ANDROID_AVD_ROOT:-${RUNNER_TEMP:-$HOME}/jm-android-floor-avd}"

export ANDROID_AVD_HOME="$AVD_ROOT/avd"
export ANDROID_EMULATOR_HOME="$AVD_ROOT/emulator-home"
export ANDROID_PREFS_ROOT="$AVD_ROOT/preferences"
mkdir -p \
  "$(dirname "$LOG_PATH")" \
  "$(dirname "$PID_PATH")" \
  "$ANDROID_AVD_HOME" \
  "$ANDROID_EMULATOR_HOME" \
  "$ANDROID_PREFS_ROOT"

command -v avdmanager >/dev/null
command -v adb >/dev/null
test -x "$ANDROID_HOME/emulator/emulator"

diagnose() {
  echo "== JM floor runtime configuration ==" >&2
  printf 'EXPECTED_API=%s\nSYSTEM_IMAGE=%s\nANDROID_AVD_HOME=%s\nANDROID_EMULATOR_HOME=%s\nANDROID_PREFS_ROOT=%s\n' \
    "$EXPECTED_API" "$SYSTEM_IMAGE" "$ANDROID_AVD_HOME" "$ANDROID_EMULATOR_HOME" "$ANDROID_PREFS_ROOT" >&2
  echo "== JM floor AVD files ==" >&2
  find "$AVD_ROOT" -maxdepth 3 -type f -printf '%p\n' >&2 2>/dev/null || true
  echo "== JM floor emulator AVD list ==" >&2
  "$ANDROID_HOME/emulator/emulator" -list-avds >&2 || true
  echo "== JM floor emulator process ==" >&2
  if [[ -f "$PID_PATH" ]]; then
    emulator_pid="$(cat "$PID_PATH")"
    ps -fp "$emulator_pid" >&2 || true
  else
    echo "no emulator PID receipt" >&2
  fi
  echo "== JM floor adb devices ==" >&2
  timeout 10 adb devices -l >&2 || true
  echo "== JM floor emulator properties ==" >&2
  timeout 10 adb shell getprop ro.build.version.sdk >&2 || true
  timeout 10 adb shell getprop ro.build.version.release >&2 || true
  timeout 10 adb shell getprop ro.product.cpu.abi >&2 || true
  echo "== JM floor emulator log tail ==" >&2
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

AVD_PATH="$ANDROID_AVD_HOME/${AVD_NAME}.avd"
printf 'no\n' | avdmanager create avd \
  --force \
  --name "$AVD_NAME" \
  --package "$SYSTEM_IMAGE" \
  --path "$AVD_PATH"

if ! "$ANDROID_HOME/emulator/emulator" -list-avds | grep -Fxq "$AVD_NAME"; then
  echo "Created floor AVD is not visible to the emulator: $AVD_NAME" >&2
  exit 1
fi

echo "JM_ANDROID_FLOOR_AVD_CREATE_PASS:$AVD_NAME:$AVD_PATH"

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

echo "JM floor emulator PID: $emulator_pid"
echo "JM floor emulator acceleration: ${ACCELERATION[*]}"

registered=0
for attempt in $(seq 1 "$ADB_REGISTER_ATTEMPTS"); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    echo "Android floor emulator exited before ADB registration" >&2
    exit 1
  fi
  if timeout 5 adb get-state 2>/dev/null | grep -qx 'device'; then
    registered=1
    echo "JM_ANDROID_FLOOR_ADB_REGISTER_PASS:$attempt"
    break
  fi
  sleep 5
done

if [[ "$registered" != "1" ]]; then
  echo "Android floor emulator failed to register as an ADB device" >&2
  exit 1
fi

booted=0
for attempt in $(seq 1 "$BOOT_ATTEMPTS"); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    echo "Android floor emulator exited before sys.boot_completed=1" >&2
    exit 1
  fi
  state="$(timeout 10 adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [[ "$state" == "1" ]]; then
    booted=1
    echo "JM_ANDROID_FLOOR_SYSTEM_BOOT_PASS:$attempt"
    break
  fi
  sleep 5
done

if [[ "$booted" != "1" ]]; then
  echo "Android floor emulator failed to reach sys.boot_completed=1" >&2
  exit 1
fi

timeout 30 adb shell settings put global window_animation_scale 0
timeout 30 adb shell settings put global transition_animation_scale 0
timeout 30 adb shell settings put global animator_duration_scale 0
timeout 30 adb shell input keyevent 82 || true
timeout 30 adb shell wm dismiss-keyguard || true

actual_api="$(timeout 30 adb shell getprop ro.build.version.sdk | tr -d '\r')"
actual_release="$(timeout 30 adb shell getprop ro.build.version.release | tr -d '\r')"
actual_abi="$(timeout 30 adb shell getprop ro.product.cpu.abi | tr -d '\r')"
if [[ "$actual_api" != "$EXPECTED_API" ]]; then
  echo "Android floor mismatch: expected API $EXPECTED_API, recovered $actual_api" >&2
  exit 1
fi

timeout 30 adb devices -l
trap - EXIT

echo "JM_ANDROID_EXACT_API_BOOT_PASS:$actual_api:$actual_release:$actual_abi:$AVD_NAME"
