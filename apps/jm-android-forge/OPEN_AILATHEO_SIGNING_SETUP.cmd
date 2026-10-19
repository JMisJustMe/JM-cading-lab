@echo off
setlocal
cd /d "%~dp0\..\.."
echo.
echo JM AILatheo - one-time PRIVATE signing identity setup
echo This runs locally on your own laptop. No keystore or password enters the repository.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\Initialize-JMAILatheoReleaseSigning.ps1"
set "JM_SETUP_EXIT=%ERRORLEVEL%"
echo.
if not "%JM_SETUP_EXIT%"=="0" (
  echo Setup held safely. No APK has been released. Read the message above and retry.
) else (
  echo Owner signing identity created, backed up and registered with protected GitHub secrets.
  echo Do not delete the original keystore or backup.
)
echo.
pause
exit /b %JM_SETUP_EXIT%
