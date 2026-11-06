@echo off
REM JM Work Mode: manual-only independent browser entrance; no screen-awake setting changes.
cd /d "%~dp0"
py -3 "tools\jm_work_mode_launch.py"
if errorlevel 1 (
  echo JM Work Mode is held. See the controller's local logs for the cause.
  pause
)
