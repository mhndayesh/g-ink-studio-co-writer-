#requires -Version 5.1
<#
  install.ps1 - deploy the llama-server runtime + helper scripts to C:\llama
  and download the newest Windows Vulkan x64 build.

  Usage:
    powershell -ExecutionPolicy Bypass -File infra\llama-server\install.ps1
    powershell -ExecutionPolicy Bypass -File infra\llama-server\install.ps1 -Destination D:\llama
#>
[CmdletBinding()]
param(
    [string]$Destination = "C:\llama"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Destination "models") | Out-Null

foreach ($name in "start-server.ps1", "start-server.bat", "stop-server.bat", "status.ps1", "update-llama.ps1") {
    Copy-Item -LiteralPath (Join-Path $here $name) -Destination $Destination -Force
}

$config = Join-Path $Destination "config.env"
if (-not (Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $here "config.example.env") -Destination $config
    Write-Host "[install] wrote $config - edit MODEL before starting."
} else {
    Write-Host "[install] kept existing $config"
}

Write-Host "[install] fetching latest llama.cpp Vulkan build..."
& (Join-Path $Destination "update-llama.ps1") -Destination $Destination

Write-Host ""
Write-Host "[install] next:" -ForegroundColor Green
Write-Host "  1. Put a .gguf in $Destination\models"
Write-Host "  2. Set MODEL in $config"
Write-Host "  3. Run $Destination\start-server.bat"
Write-Host "  4. Check: powershell -File $Destination\status.ps1"
