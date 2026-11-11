@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title G-Ink Co-Writer - start

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" -Detach
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [err] start failed - see the messages above and .run-logs\
  pause
  exit /b %RC%
)

echo.
echo Running. Stop it with stop.bat.
ping -n 6 127.0.0.1 >nul
exit /b 0
