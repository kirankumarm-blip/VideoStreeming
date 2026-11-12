# ============================================
#   XLurn Platform - Start All Services
# ============================================
# Run this script to start the full platform:
#   - MinIO Object Storage (port 9000 / console: 9001)
#   - Backend Mock Server  (port 5000)
#   - Upload Service       (port 5050)
#   - Admin Web App        (port 3000)
#   - User Web App         (port 3001)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting XLurn Platform Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start MinIO
Write-Host "`n[1/5] Starting MinIO Object Storage..." -ForegroundColor Yellow
$minioExe = "C:\MinIO\minio.exe.exe"
if (Test-Path $minioExe) {
    Start-Process -FilePath $minioExe `
        -ArgumentList "server", "C:\MinIO\data", "--console-address", ":9001" `
        -WindowStyle Normal
    Write-Host "      MinIO started  -> API: http://localhost:9000  Console: http://localhost:9001" -ForegroundColor Green
    Start-Sleep -Seconds 3
} else {
    Write-Host "      WARNING: MinIO not found at $minioExe — skipping." -ForegroundColor Red
}

# 2. Start Backend Mock Server
Write-Host "`n[2/5] Starting Backend Mock Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\backend-mock'; Write-Host 'Backend Mock (port 5000)' -ForegroundColor Cyan; node server.js" `
    -WindowStyle Normal
Write-Host "      Backend started -> http://localhost:5000" -ForegroundColor Green

Start-Sleep -Seconds 2

# 3. Start Upload Service
Write-Host "`n[3/5] Starting Upload Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\backend-mock'; Write-Host 'Upload Service (port 5050)' -ForegroundColor Cyan; node upload-service.js" `
    -WindowStyle Normal
Write-Host "      Upload service  -> http://localhost:5050" -ForegroundColor Green

Start-Sleep -Seconds 2

# 4. Start Admin Web App
Write-Host "`n[4/5] Starting Admin Web App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\admin-web-app'; Write-Host 'Admin Portal (port 3000)' -ForegroundColor Cyan; npm start" `
    -WindowStyle Normal
Write-Host "      Admin portal    -> http://localhost:3000/VideoStreeming/admin" -ForegroundColor Green

Start-Sleep -Seconds 2

# 5. Start User Web App
Write-Host "`n[5/5] Starting User Web App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\user-web-app'; Write-Host 'User Portal (port 3001)' -ForegroundColor Cyan; npm start" `
    -WindowStyle Normal
Write-Host "      User portal     -> http://localhost:3001/VideoStreeming" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   All Services Launched!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   MinIO Console : http://localhost:9001" -ForegroundColor White
Write-Host "   Backend API   : http://localhost:5000" -ForegroundColor White
Write-Host "   Upload Service: http://localhost:5050" -ForegroundColor White
Write-Host "   Admin Portal  : http://localhost:3000/VideoStreeming/admin" -ForegroundColor White
Write-Host "   User Portal   : http://localhost:3001/VideoStreeming" -ForegroundColor White
Write-Host ""
Write-Host "   MinIO Login -> user: minioadmin  pass: minioadmin" -ForegroundColor DarkGray
