#requires -Version 5.1
# Quick health check for the local llama-server.
param(
    [string]$BaseUrl = "http://127.0.0.1:8081"
)

try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 5
    $props  = Invoke-RestMethod -Uri "$BaseUrl/props"  -TimeoutSec 5
    $slots  = Invoke-RestMethod -Uri "$BaseUrl/slots"  -TimeoutSec 5

    $model = $props.model_path
    $nCtx  = $props.default_generation_settings.n_ctx
    $total = ($slots | Measure-Object).Count

    Write-Host "[llama-server] OK" -ForegroundColor Green
    Write-Host "  model : $model"
    Write-Host "  n_ctx : $nCtx"
    Write-Host "  slots : $total"
    Write-Host "  health: $($health.status)"
} catch {
    Write-Host "[llama-server] not reachable at $BaseUrl - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
