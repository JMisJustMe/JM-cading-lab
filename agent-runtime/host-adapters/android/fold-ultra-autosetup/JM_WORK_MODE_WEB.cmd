@echo off
REM JM ECOSTATE Work Mode web door. Local laptop only. Does NOT change sleep settings.
cd /d "%~dp0"
py -3 "tools\jm_work_mode_web.py"
if errorlevel 1 (
  echo JM Work Mode browser door failed to launch; check Python and the original checkout.
  pause
)
