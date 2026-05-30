# ============================================
# Checkrace Web — Quick Push Script
# ใช้ครั้งต่อไปทุกครั้งที่แก้เว็บ
# ============================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$msg = Read-Host "Commit message (Enter = อัพเดทเว็บ)"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "อัพเดทเว็บ" }

git add .
git commit -m "$msg"
git push

Write-Host ""
Write-Host "[OK] Push สำเร็จ — Cloudflare จะ deploy อัตโนมัติใน ~30 วินาที" -ForegroundColor Green
Write-Host "    URL: https://checkrace-web.pages.dev" -ForegroundColor Yellow
Write-Host ""

Read-Host "กด Enter เพื่อปิด"
