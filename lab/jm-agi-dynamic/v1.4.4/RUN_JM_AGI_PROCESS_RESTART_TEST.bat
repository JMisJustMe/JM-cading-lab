@echo off
setlocal
cd /d "%~dp0"
title JM AGI Lab v1.4.4 - Process Restart Durability Test - Runner R4
echo JM AGI Lab v1.4.4 - Process Restart Durability Test - Runner R4
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0JM_AGI_LAB_v1_4_4_PROCESS_WITNESS.ps1"
set "rc=%ERRORLEVEL%"
echo.
if not "%rc%"=="0" (
  echo TEST RUNNER HOLD/ERROR - no process-restart Ding should be claimed.
  echo Report the visible PowerShell error if this exact R4 package ever reaches owner contact.
) else (
  echo Runner R4 returned normally. Read the reopened JM AGI page for the final PASS/HOLD scope decision.
)
echo.
pause
exit /b %rc%