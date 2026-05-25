# ============================================
# VELAMIA SHOP - Script de Deploy
# Ejecuta este archivo para subir cambios
# ============================================

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   VELAMIA SHOP - Subiendo cambios..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Copiar archivos actualizados a la carpeta public
Write-Host "Copiando archivos a carpeta public..." -ForegroundColor Yellow
Copy-Item "index.html" "public\index.html" -Force
Copy-Item "images" "public\images" -Recurse -Force
Write-Host "OK - Archivos copiados" -ForegroundColor Green

# 2. Subir a Cloudflare (sitio web en vivo)
Write-Host ""
Write-Host "Subiendo a Cloudflare (velamia.shop)..." -ForegroundColor Yellow
npx wrangler deploy
Write-Host "OK - Sitio actualizado en vivo" -ForegroundColor Green

# 3. Guardar en GitHub (respaldo)
Write-Host ""
Write-Host "Guardando respaldo en GitHub..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\GitHub CLI"
$fecha = Get-Date -Format "dd/MM/yyyy HH:mm"
git add -A
git commit -m "Actualizacion $fecha"
git push origin main
Write-Host "OK - Respaldo guardado en GitHub" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   LISTO! Todo actualizado." -ForegroundColor Green
Write-Host "   Visita: velamia.shop" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona Enter para cerrar"
