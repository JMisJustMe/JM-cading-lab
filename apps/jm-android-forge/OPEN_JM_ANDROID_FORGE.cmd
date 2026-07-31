@echo off
setlocal
set "APP_DIR=%~dp0"
for %%I in ("%APP_DIR%..\..") do set "REPO_ROOT=%%~fI"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\tools\Start-JMAndroidForge.ps1" -RepoRoot "%REPO_ROOT%"
if errorlevel 1 (
  echo.
  echo JM Android Forge could not start. Read the message above; nothing was installed or altered automatically.
  pause
)
endlocal
