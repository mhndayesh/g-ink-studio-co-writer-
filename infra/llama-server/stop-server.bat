@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Get-Process llama-server -ErrorAction SilentlyContinue; if ($p) { $p | Stop-Process -Force; Write-Host '[llama-server] stopped' } else { Write-Host '[llama-server] not running' }"
endlocal
