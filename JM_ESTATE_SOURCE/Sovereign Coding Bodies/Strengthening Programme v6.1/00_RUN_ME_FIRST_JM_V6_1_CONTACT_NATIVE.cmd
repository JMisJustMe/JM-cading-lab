@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 JM_V6_1_EXTERNAL_CONTACT_ORCHESTRATOR.py --write-test --native
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python JM_V6_1_EXTERNAL_CONTACT_ORCHESTRATOR.py --write-test --native
  goto :end
)
echo Python was not found in PATH.
:end
pause