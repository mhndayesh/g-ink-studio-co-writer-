@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title G-Ink Co-Writer - stop

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [err] something is still listening - see above
  pause
  exit /b %RC%
)

echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
