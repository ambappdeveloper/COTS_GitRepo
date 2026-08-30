@echo off
setlocal
title COTS integrated mockup v1.2 - portable file

rem Opens the built single-file copy. Nothing to install, no Node, no network.
set PAGE=%~dp0MergedMockup\portable\COTS Integrated Mockup.html

if not exist "%PAGE%" (
  echo.
  echo   The portable file has not been built yet.
  echo.
  echo   Build it once with:
  echo       cd /d "%~dp0MergedMockup"
  echo       npm install
  echo       npm run build:portable
  echo.
  echo   Or use run-mockup.bat, which runs the mockup from source instead.
  echo.
  pause
  exit /b 1
)

echo.
echo   Opening "%PAGE%"
echo.
echo   Sign in on the COTS screen - the password is  demo  for every account.
echo   One sign-in only: the Export screens open inside that same session.
echo.
echo   Keep this folder structure as it is: the Export screens are loaded from
echo   ..\COTS_Export_Mockup_v1.1\portable\COTS Export Mock-up.html
echo.

start "" "%PAGE%"
