# ============================================
# Checkrace Web — GitHub Setup Script (PowerShell)
# ============================================
# วิธีรัน:
#   1. คลิกขวาที่ไฟล์ → "Run with PowerShell"
#   2. หรือเปิด PowerShell แล้วรัน: .\setup-github.ps1
# ============================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Checkrace Web — GitHub Setup"            -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1) Check git installed
try { git --version | Out-Null } catch {
  Write-Host "[X] ไม่พบ Git — กรุณาติดตั้ง: https://git-scm.com/download/win" -ForegroundColor Red
  Read-Host "กด Enter เพื่อปิด"
  exit 1
}
Write-Host "[OK] Git พร้อมใช้งาน" -ForegroundColor Green

# 2) Ask GitHub username + repo
$githubUser = Read-Host "GitHub username ของคุณ"
$repoName   = Read-Host "ชื่อ repo (Enter = checkrace-web)"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = "checkrace-web" }

$remoteUrl = "https://github.com/$githubUser/$repoName.git"

Write-Host ""
Write-Host "Remote URL: $remoteUrl" -ForegroundColor Yellow
Write-Host ""

# 3) Clean broken .git (if exists from previous failed attempt)
if (Test-Path .git\config.lock) {
  Write-Host "พบ .git ที่เสีย กำลังลบ..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force .git
}

# 4) Init / configure
if (-not (Test-Path .git)) {
  git init -b main
}
git config user.email "alongkorn@raceup.co.th"
git config user.name  "Korn"

# 5) Add + commit
git add .
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "[INFO] ไม่มีไฟล์ที่ต้อง commit" -ForegroundColor Yellow
} else {
  git commit -m "Initial commit: Checkrace web with Dashboard (26 events 2026, 100K runners target)"
  Write-Host "[OK] Commit สำเร็จ" -ForegroundColor Green
}

# 6) Set remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}
Write-Host "[OK] ตั้ง remote เรียบร้อย" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ขั้นตอนถัดไป (ทำด้วยตัวเอง)"                -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) สร้าง repo ว่างๆ บน GitHub:" -ForegroundColor White
Write-Host "   https://github.com/new" -ForegroundColor Yellow
Write-Host "   ชื่อ: $repoName  (อย่ากา Add README)"
Write-Host ""
Write-Host "2) Push code:" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "3) เชื่อม Cloudflare Pages:" -ForegroundColor White
Write-Host "   ดู CLOUDFLARE_SETUP.md  (STEP 2 เป็นต้นไป)"
Write-Host ""

Read-Host "กด Enter เพื่อปิด"
