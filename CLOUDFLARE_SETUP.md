# Cloudflare Pages Auto-Deploy ผ่าน GitHub

## Executive Summary

วิธีตั้งค่าให้ทุกครั้งที่ `git push` → Cloudflare deploy เว็บอัตโนมัติ ไม่ต้องรัน Wrangler ทุกครั้ง

**สิ่งที่ต้องมี:**
- GitHub account
- Cloudflare account (free plan ใช้ได้)
- Git ติดตั้งบนเครื่อง

---

## STEP 1 — สร้าง GitHub Repo

### 1.1 สร้าง repo บน GitHub

1. ไปที่ https://github.com/new
2. **Repository name:** `checkrace-web` (หรือชื่อใดก็ได้)
3. **Visibility:** Private (แนะนำ) หรือ Public ก็ได้
4. **อย่า** กา "Add README" — เรามีอยู่แล้ว
5. กด **Create repository**

### 1.2 Push code จากเครื่อง

เปิด Terminal/PowerShell ใน folder โปรเจค:

```bash
cd "C:\Users\along\OneDrive\Documents\Claude\Projects\Checkrace Web"

git init
git add .
git commit -m "Initial commit: Checkrace web with dashboard"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/checkrace-web.git
git push -u origin main
```

**หมายเหตุ:** เปลี่ยน `<YOUR_USERNAME>` เป็น GitHub username ของคุณ

---

## STEP 2 — เชื่อม Cloudflare Pages กับ GitHub

### 2.1 เข้า Cloudflare Dashboard

1. ไปที่ https://dash.cloudflare.com
2. เมนูซ้าย → **Workers & Pages**
3. กด **Create** → tab **Pages** → **Connect to Git**

### 2.2 Authorize GitHub

1. กด **Connect GitHub**
2. เลือก account → **Only select repositories** → เลือก `checkrace-web`
3. กด **Install & Authorize**

### 2.3 ตั้งค่า Build

| Field | Value |
|---|---|
| **Project name** | `checkrace-web` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | (เว้นว่าง) |
| **Build output directory** | `/` |
| **Root directory** | (เว้นว่าง) |

กด **Save and Deploy**

### 2.4 รอ Deploy ครั้งแรก

~30 วินาที — จะได้ URL:
```
https://checkrace-web.pages.dev
```

---

## STEP 3 — Workflow ครั้งต่อไป

ทุกครั้งที่แก้ไขเว็บ:

```bash
cd "C:\Users\along\OneDrive\Documents\Claude\Projects\Checkrace Web"

git add .
git commit -m "อธิบายว่าแก้อะไร"
git push
```

Cloudflare จะ deploy ให้อัตโนมัติภายใน 30 วินาที — ดูสถานะที่ dashboard

---

## STEP 4 — Custom Domain (เมื่อพร้อม)

เมื่อมี domain จริง เช่น `web.checkrace.com`:

1. Cloudflare Dashboard → **Workers & Pages** → `checkrace-web`
2. tab **Custom domains** → **Set up a custom domain**
3. กรอก domain → Cloudflare ตั้ง DNS ให้อัตโนมัติ (ถ้า domain อยู่ใน Cloudflare)

---

## Branch Strategy (แนะนำ)

- `main` → Production (auto-deploy ขึ้น `.pages.dev`)
- `dev` → Preview (Cloudflare deploy preview URL ให้ดูก่อน merge)

ทดสอบบน `dev`:
```bash
git checkout -b dev
# แก้ไข
git add . && git commit -m "test feature"
git push -u origin dev
```
Cloudflare จะให้ URL preview เช่น `https://dev.checkrace-web.pages.dev`

---

## Rollback (ถ้า deploy พลาด)

1. Cloudflare Dashboard → `checkrace-web` → **Deployments**
2. หาเวอร์ชันก่อนหน้า → **⋯ menu** → **Rollback to this deployment**

---

## Troubleshooting

| ปัญหา | วิธีแก้ |
|---|---|
| `git push` ขึ้น "Permission denied" | ใช้ Personal Access Token แทน password — สร้างที่ GitHub → Settings → Developer settings → Tokens |
| Deploy fail | ดู log ที่ Cloudflare → Deployments → กดที่ deployment เพื่อดู build log |
| รูป/CSS ไม่ขึ้น | ตรวจสอบ path ใน HTML ว่าใช้ `css/style.css` ไม่ใช่ `/css/style.css` (ห้ามมี slash นำ) |
| 4 ภาษาไม่ทำงาน | เปิด DevTools → Console ดู error จาก `js/i18n.js` |

---

© 2026 Race Up Work Co., Ltd.
