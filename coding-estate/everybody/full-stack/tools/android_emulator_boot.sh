#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${JM_AVD_NAME:-jm_api35_runtime}"
SYSTEM_IMAGE="${JM_SYSTEM_IMAGE:-system-images;android-35;google_apis;x86_64}"
LOG_PATH="${JM_EMULATOR_LOG:-build/android-emulator.log}"
PID_PATH="${JM_EMULATOR_PID:-build/android-emulator.pid}"
mkdir -p "$(dirname "$LOG_PATH")" "$(dirname "$PID_PATH")"

command -v sdkmanager >/dev/null
command -v avdmanager >/dev/null
command -v adb >/dev/null

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platform-tools" "emulator" "$SYSTEM_IMAGE"

if [[ -e /dev/kvm ]]; then
  sudo chmod 666 /dev/kvm
  ACCELERATION=("-accel" "on")
else
  ACCELERATION=("-accel" "off")
fi

echo no | avdmanager create avd --force --name "$AVD_NAME" --package "$SYSTEM_IMAGE"

nohup "$ANDROID_HOME/emulator/emulator" \
  -avd "$AVD_NAME" \
  -no-window \
  -no-audio \
  -no-boot-anim \
  -no-snapshot \
  -wipe-data \
  -camera-back none \
  -camera-front none \
  -gpu swiftshader_indirect \
  "${ACCELERATION[@]}" \
  >"$LOG_PATH" 2>&1 &
echo $! > "$PID_PATH"

adb wait-for-device
booted=0
for _ in $(seq 1 180); do
  state="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [[ "$state" == "1" ]]; then
    booted=1
    break
  fi
  sleep 5
done

if [[ "$booted" != "1" ]]; then
  echo "Android emulator failed to reach sys.boot_completed=1" >&2
  tail -n 300 "$LOG_PATH" >&2 || true
  exit 1
fi

adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82 || true
adb shell wm dismiss-keyguard || true
adb shell getprop ro.build.version.sdk | grep -x '35'
adb shell getprop ro.product.cpu.abi
adb devices -l

echo "JM_ANDROID_EMULATOR_API35_BOOT_PASS:$AVD_NAME"
