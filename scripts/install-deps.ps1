# Safe Windows install: rename broken node_modules instead of rmdir (avoids ENOTEMPTY/EPERM).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (Test-Path node_modules) {
  $backup = "node_modules.bak." + (Get-Date -Format "yyyyMMddHHmmss")
  Write-Host "Renaming node_modules -> $backup"
  Rename-Item -LiteralPath node_modules -NewName $backup
}

Write-Host "Running npm install..."
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Verifying next..."
if (-not (Test-Path "node_modules\next\package.json")) {
  Write-Error "next package missing after install"
  exit 1
}

Write-Host "OK. You can delete old node_modules.bak.* folders when nothing is using them."
