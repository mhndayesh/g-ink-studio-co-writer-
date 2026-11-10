#requires -Version 5.1
<#
  start-server.ps1 - launch llama.cpp's llama-server with dual-AMD-GPU Vulkan.

  Reads C:\llama\config.env (simple KEY=VALUE, # comments). All flags are
  explicit so you can see and tune exactly what runs.
#>
[CmdletBinding()]
param(
    [string]$ConfigPath = "",
    [switch]$Background,
    [string]$LogPrefix = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configFile = if ($ConfigPath) { $ConfigPath } else { Join-Path $root "config.env" }
$server = Join-Path $root "llama-server.exe"

if (-not (Test-Path -LiteralPath $server)) {
    throw "llama-server.exe not found in $root. Re-download the Vulkan build."
}
if (-not (Test-Path -LiteralPath $configFile)) {
    throw "config file not found: $configFile"
}

# -- Parse KEY=VALUE config (no external modules) -----------------------------
$cfg = @{}
foreach ($raw in Get-Content -LiteralPath $configFile) {
    $line = $raw.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) { continue }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { continue }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    $cfg[$key] = $val
}

function Get-Cfg([string]$name, [string]$default = "") {
    if ($cfg.ContainsKey($name) -and $null -ne $cfg[$name] -and $cfg[$name] -ne "") {
        return $cfg[$name]
    }
    return $default
}

$model = Get-Cfg "MODEL"
if (-not $model -or $model -match "YOUR_MODEL") {
    throw "Set MODEL in config.env to a real .gguf (e.g. C:\llama\models\qwen3-8b-q4_k_m.gguf)."
}
if (-not (Test-Path -LiteralPath $model)) {
    throw "Model not found: $model"
}

$alias        = Get-Cfg "ALIAS" "local"
$hostAddr     = Get-Cfg "HOST" "127.0.0.1"
$port         = Get-Cfg "PORT" "8080"
$ctx          = Get-Cfg "CTX" "131072"
$parallel     = Get-Cfg "PARALLEL" "8"
$kvUnified    = Get-Cfg "KV_UNIFIED" "1"
$kvPerSlot    = Get-Cfg "KV_UNIFIED_PER_SLOT"
$kvK          = Get-Cfg "KV_K" "q8_0"
$kvV          = Get-Cfg "KV_V" "q8_0"
$cacheReuse   = Get-Cfg "CACHE_REUSE" "256"
$flashAttn    = Get-Cfg "FLASH_ATTN" "on"
$devices      = Get-Cfg "DEVICES" "Vulkan0,Vulkan1"
$splitMode    = Get-Cfg "SPLIT_MODE" "layer"
$tensorSplit  = Get-Cfg "TENSOR_SPLIT" "1,1"
$mainGpu      = Get-Cfg "MAIN_GPU" "0"
$gpuLayers    = Get-Cfg "GPU_LAYERS" "999"
$threads      = Get-Cfg "THREADS"
$batch        = Get-Cfg "BATCH" "2048"
$ubatch       = Get-Cfg "UBATCH" "512"
$contBatch    = Get-Cfg "CONT_BATCHING" "1"
$metrics      = Get-Cfg "METRICS" "1"
$slots        = Get-Cfg "SLOTS" "1"
$noWebui      = Get-Cfg "NO_WEBUI" "1"
$timeout      = Get-Cfg "TIMEOUT" "3600"
$apiKey       = Get-Cfg "API_KEY"
$extraArgs    = Get-Cfg "EXTRA_ARGS"
$dryRun       = Get-Cfg "DRY_RUN" "0"

$llamaArgs = @(
    "-m", $model,
    "--alias", $alias,
    "--host", $hostAddr,
    "--port", $port,
    "--ctx-size", $ctx,
    "--parallel", $parallel,
    "-ngl", $gpuLayers,
    "--device", $devices,
    "--split-mode", $splitMode,
    "--main-gpu", $mainGpu,
    "--batch-size", $batch,
    "--ubatch-size", $ubatch,
    "--cache-type-k", $kvK,
    "--cache-type-v", $kvV,
    "--flash-attn", $flashAttn,
    "--timeout", $timeout,
    "--jinja"
)

if ($tensorSplit) { $llamaArgs += @("--tensor-split", $tensorSplit) }
if ($threads)     { $llamaArgs += @("--threads", $threads) }
if ($kvUnified -eq "1") { $llamaArgs += "--kv-unified" } else { $llamaArgs += "--no-kv-unified" }
if ($kvPerSlot) { $llamaArgs += @("--kv-unified-per-slot", $kvPerSlot) }
if ($contBatch -eq "1") { $llamaArgs += "--cont-batching" } else { $llamaArgs += "--no-cont-batching" }
if ($metrics -eq "1")   { $llamaArgs += "--metrics" }
if ($slots -eq "1")     { $llamaArgs += "--slots" }
if ($noWebui -eq "1")   { $llamaArgs += "--no-webui" }
if ($cacheReuse -and $cacheReuse -ne "0") { $llamaArgs += @("--cache-reuse", $cacheReuse) }
if ($apiKey) { $llamaArgs += @("--api-key", $apiKey) }
if ($extraArgs) { $llamaArgs += ($extraArgs -split "\s+") }

Write-Host "[llama-server] build 12246 - Vulkan x64" -ForegroundColor DarkGray
Write-Host "[llama-server] model   $model"
Write-Host "[llama-server] devices $devices  split=$splitMode  tensor=$tensorSplit"
Write-Host "[llama-server] ctx     $ctx total / $parallel slots  kv=$kvK,$kvV unified=$kvUnified"
Write-Host "[llama-server] api     http://${hostAddr}:${port}/v1  (model alias: $alias)" -ForegroundColor Green
Write-Host ""

if ($dryRun -eq "1") {
    Write-Host "[llama-server] DRY_RUN=1 - command line:"
    Write-Host ($llamaArgs -join " ")
    exit 0
}

if ($Background) {
    $outLog = if ($LogPrefix) { "$LogPrefix.out.log" } else { Join-Path $root "server.out.log" }
    $errLog = if ($LogPrefix) { "$LogPrefix.err.log" } else { Join-Path $root "server.err.log" }
    if (Test-Path -LiteralPath $outLog) { Remove-Item -LiteralPath $outLog -Force }
    if (Test-Path -LiteralPath $errLog) { Remove-Item -LiteralPath $errLog -Force }
    $proc = Start-Process -FilePath $server -ArgumentList $llamaArgs -WorkingDirectory $root `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
    Write-Host "[llama-server] started pid=$($proc.Id)"
    Write-Host "[llama-server] logs $outLog / $errLog"
    exit 0
}

# exec so Ctrl+C reaches llama-server directly
& $server @llamaArgs
exit $LASTEXITCODE
