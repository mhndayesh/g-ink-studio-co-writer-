#requires -Version 5.1
<#
  update-llama.ps1 - fetch the newest llama.cpp Windows Vulkan x64 build and
  overlay it into C:\llama, preserving config.env and the helper scripts.
#>
[CmdletBinding()]
param(
    [string]$Destination = "C:\llama"
)

$ErrorActionPreference = "Stop"
$headers = @{ "User-Agent" = "g-ink-llama-updater" }

Write-Host "[update] querying llama.cpp releases..."
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=30" -Headers $headers

$release = $releases |
    Where-Object { $_.tag_name -match "^b\d+$" -and -not $_.draft } |
    Select-Object -First 1

if (-not $release) { throw "No b-tag release found." }

$asset = $release.assets |
    Where-Object { $_.name -match "bin-win-vulkan-x64\.zip$" } |
    Select-Object -First 1

if (-not $asset) { throw "Release $($release.tag_name) has no win-vulkan-x64 asset." }

$current = "unknown"
$versionFile = Join-Path $Destination "VERSION.txt"
if (Test-Path -LiteralPath $versionFile) {
    $current = (Get-Content -LiteralPath $versionFile -Raw).Trim()
}

Write-Host "[update] current: $current"
Write-Host "[update] latest : $($release.tag_name)  ($($asset.name), $([math]::Round($asset.size/1MB,1)) MB)"

if ($current -eq $release.tag_name) {
    Write-Host "[update] already current - nothing to do." -ForegroundColor Green
    return
}

$tmp = Join-Path $env:TEMP ("llama-" + $release.tag_name + ".zip")
Write-Host "[update] downloading..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -Headers $headers

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Write-Host "[update] extracting over $Destination (config.env preserved)..."
Expand-Archive -LiteralPath $tmp -DestinationPath $Destination -Force
Remove-Item -LiteralPath $tmp -Force

Set-Content -LiteralPath $versionFile -Value $release.tag_name -Encoding ASCII
Write-Host "[update] done: $($release.tag_name)" -ForegroundColor Green
Write-Host "[update] verify: C:\llama\llama-server.exe --version"
