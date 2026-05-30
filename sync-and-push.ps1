# ============================================
# Checkrace Web — Sync OneDrive → C:\Claude Projects → Push GitHub
# ============================================
# วิธีรัน: คลิกขวา → Run with PowerShell
# (หรือ copy ไฟล์นี้ไปไว้ที่ C:\Claude Projects\Web Site Creation\checkrace-web\)
# ============================================

$ErrorActionPreference = "Stop"

# --- กำหนด path ---
$src = "C:\Users\along\OneDrive\Documents\Claude\Projects\Checkrace Web"
$dst = "C:\Claude Projects\Web Site Creation\checkrace-web"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Sync + Push  Checkrace Web"                    -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source:      $src" -ForegroundColor Yellow
Write-Host "Destination: $dst" -ForegroundColor Yellow
Write-Host ""

# --- ตรวจ folder ---
if (-not (Test-Path $src)) {
  Write-Host "[X] ไม่พบ folder ต้นทาง: $src" -ForegroundColor Red
  Read-Host "กด Enter เพื่อปิด"; exit 1
}
if (-not (Test-Path $dst)) {
  Write-Host "[X] ไม่พบ folder ปลายทาง — gh clone ก่อน" -ForegroundColor Red
  Read-Host "กด Enter เพื่อปิด"; exit 1
}

# --- 1. Copy ไฟล์ (ยกเว้น .git, *.lock, ps1 script ตัวเอง) ---
Write-Host "[1/3] กำลัง copy ไฟล์..." -ForegroundColor Cyan
robocopy $src $dst /E /XD .git /XF *.lock setup-github.ps1 sync-and-push.ps1 /NFL /NDL /NJH /NJS /NC /NS | Out-Null
Write-Host "[OK] Copy เสร็จ" -ForegroundColor Green
Write-Host ""

# --- 2. เข้า repo + commit ---
Set-Location $dst
Write-Host "[2/3] กำลัง commit..." -ForegroundColor Cyan

git add . | Out-Null
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "[INFO] ไม่มีไฟล์เปลี่ยน — ไม่ต้อง push" -ForegroundColor Yellow
  Read-Host "กด Enter เพื่อปิด"; exit 0
}

# ถาม commit message
$msg = Read-Host "Commit message (Enter = 'อัพเดทเว็บ + Dashboard')"
if ([string]::IsNullOrWhiteSpace($msg)) {
  $msg = "อัพเดทเว็บ + Dashboard 26 events 2026"
}

git commit -m "$msg" | Out-Null
Write-Host "[OK] Commit สำเร็จ: $msg" -ForegroundColor Green
Write-Host ""

# --- 3. Push ---
Write-Host "[3/3] กำลัง push..." -ForegroundColor Cyan
git push

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  [OK] Push สำเร็จ"                              -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Cloudflare จะ deploy อัตโนมัติใน ~30 วินาที"     -ForegroundColor White
Write-Host "URL: https://checkrace-web.pages.dev"            -ForegroundColor Yellow
Write-Host ""

Read-Host "กด Enter เพื่อปิด"
