@echo off
REM JM ECOSTATE — owner-triggered real work queue, NOT JM ON MODE or keep-awake.
cd /d "%~dp0"
py -3 "tools\jm_work_mode.py" gui
if errorlevel 1 (
  echo JM Work Mode could not launch. Check Python and the existing JM-cading-lab checkout.
  pause
)
