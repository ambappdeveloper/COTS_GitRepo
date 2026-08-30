@echo off
setlocal
title COTS integrated mockup v1.2 (Core + Shared + Export)

cd /d "%~dp0MergedMockup"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found.
  echo.
  echo   Install the LTS version from https://nodejs.org, close this window,
  echo   then run this file again. See MergedMockup\README.md for details.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo   Node %NODEVER% found.

if not exist "node_modules" (
  echo.
  echo   First run - installing dependencies. This takes a minute or two
  echo   and needs internet access. It happens only once.
  echo.
  echo   Nothing is installed into the Core, Shared or Export folders.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   npm install failed. Check the internet connection and the proxy
    echo   settings, then run this file again.
    echo.
    pause
    exit /b 1
  )
)

rem The Export screens are the colleague's existing prototype, loaded and not rebuilt. v1.1 loads its
rem portable build through this application's own address, which is what lets the Core session carry
rem into it with no second sign-in. Nothing is installed into that folder and nothing in it changes.
set EXPORTFILE=%~dp0..\COTS_Export_Mockup_v1.1\portable\COTS Export Mock-up.html
if exist "%EXPORTFILE%" (
  echo   Export prototype found - the Core session will carry into it, no second sign-in.
) else (
  echo.
  echo   The Export portable file was not found at:
  echo     %EXPORTFILE%
  echo.
  echo   The Export screens will show an empty frame until it exists. Rebuild it once from
  echo   the Export project with:  npm run build:portable
  echo   Everything else in the journey works without it.
)

echo.
echo   Starting the integrated mockup. Your browser will open at http://localhost:5180
echo.
echo   Sign in on the COTS screen - the password is  demo  for every account.
echo   Press Sign in, then choose a country. You land on the Core home page;
echo   the dark bar along the top is the integration layer.
echo.
echo   v1.2 - one menu and one sign-in. The Core menu is the whole system:
echo   the twelve Core modules, and Export and Shared beneath them.
echo   The Export screens open inside the Core session, with no second sign-in.
echo.
echo   Try these accounts to see the access rule from both sides:
echo     nasreen.sayed   every module
echo     meseret.alemu   Export only
echo     yusuf.kamal     Shared Modules only
echo     fatima.idris    Reports and Dashboards only
echo.
echo   Use  Journey map  for the fourteen integrated workflows, or  Next:  to
echo   follow the eight-step demonstration.
echo.
echo   Leave this window open while you use the app. Press Ctrl+C to stop it.
echo.

call npm run dev -- --open

echo.
echo   The integrated mockup has stopped.
pause
