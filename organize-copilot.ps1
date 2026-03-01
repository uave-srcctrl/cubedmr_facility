# Script para organizar archivos de copilot-analysis
Set-Location "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter"

Write-Host "=== ORGANIZANDO ARCHIVOS DE COPILOT-ANALYSIS ===" -ForegroundColor Yellow

# 1. Copiar archivos SQL
Write-Host "`n1. Copiando archivos SQL..." -ForegroundColor Green
if (Test-Path "copilot-analysis/sql") {
    Get-ChildItem "copilot-analysis/sql" -Filter "*.sql" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination "sql/$($_.Name)" -Force
        Write-Host "  + $($_.Name)" -ForegroundColor Cyan
    }
}

# 2. Copiar tests
Write-Host "`n2. Copiando tests..." -ForegroundColor Green
if (Test-Path "copilot-analysis/test") {
    Get-ChildItem "copilot-analysis/test" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination "tests/$($_.Name)" -Force
        Write-Host "  + $($_.Name)" -ForegroundColor Cyan
    }
}

# 3. Copiar scripts
Write-Host "`n3. Copiando scripts..." -ForegroundColor Green
if (Test-Path "copilot-analysis/scripts") {
    Get-ChildItem "copilot-analysis/scripts" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination "script/$($_.Name)" -Force
        Write-Host "  + $($_.Name)" -ForegroundColor Cyan
    }
}

Write-Host "`n=== COMPLETADO ===" -ForegroundColor Green
