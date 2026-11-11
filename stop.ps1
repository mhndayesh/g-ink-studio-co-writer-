#Requires -Version 5.1
<#
.SYNOPSIS
    Stop everything start.bat / run.ps1 -Detach started - gracefully, with no leftovers.

.DESCRIPTION
    Stops the recorded API and web PIDs, then sweeps ports 8080 and 3000 for anything still
    listening (a stray child of npm.cmd or the uvicorn reloader). Each process gets a graceful
    close first; only what ignores it is force-killed after about 5s. Exits non-zero if a port
    is still busy afterwards, so a silent leftover cannot pass as success.
#>
[CmdletBinding()]
param(
    [int[]]$Ports = @(8080, 3000)
)

$ErrorActionPreference = 'Continue'

$Root    = $PSScriptRoot
$LogDir  = Join-Path $Root '.run-logs'
$PidFile = Join-Path $LogDir 'pids.json'

function Ok($m)   { Write-Host "[ok]   $m" -ForegroundColor Green }
function Inf($m)  { Write-Host "[info] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[..]   $m" -ForegroundColor Yellow }

function Test-Port([int]$Port) {
    [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-Tree([int]$TargetId, [string]$Label) {
    if (-not (Get-Process -Id $TargetId -ErrorAction SilentlyContinue)) {
        Write-Host "[skip] $Label (pid $TargetId) already stopped" -ForegroundColor DarkGray
        return
    }

    # Graceful first: no /F, so the whole tree gets a close request.
    & taskkill /PID $TargetId /T *> $null
    for ($i = 0; $i -lt 10; $i++) {
        if (-not (Get-Process -Id $TargetId -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Milliseconds 500
    }

    if (Get-Process -Id $TargetId -ErrorAction SilentlyContinue) {
        Warn "$Label ignored the graceful close - forcing"
        & taskkill /PID $TargetId /T /F *> $null
        Start-Sleep -Milliseconds 300
    }

    if (Get-Process -Id $TargetId -ErrorAction SilentlyContinue) {
        Write-Host "[warn] $Label (pid $TargetId) survived" -ForegroundColor Red
    } else {
        Ok "$Label stopped (pid $TargetId)"
    }
}

if (Test-Path $PidFile) {
    try {
        $rec = Get-Content $PidFile -Raw | ConvertFrom-Json
        if ($rec.api) { Stop-Tree -TargetId $rec.api -Label 'api' }
        if ($rec.web) { Stop-Tree -TargetId $rec.web -Label 'web' }
    } catch {
        Warn "could not read $PidFile - falling back to a port sweep"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
    Inf 'no recorded pids - sweeping the ports instead'
}

foreach ($port in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Tree -TargetId $c.OwningProcess -Label "leftover on port $port"
    }
}

$busy = @()
foreach ($port in $Ports) { if (Test-Port $port) { $busy += $port } }

Write-Host ''
if ($busy.Count -gt 0) {
    Write-Host "[err]  ports still busy: $($busy -join ', ')" -ForegroundColor Red
    exit 1
}

Ok "ports $($Ports -join ' and ') are free - nothing left running"
exit 0
