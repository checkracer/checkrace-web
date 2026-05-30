# Checkrace Web — Running Solution Platform

เว็บไซต์อย่างเป็นทางการของ **Checkrace** — แพลตฟอร์มจัดงานวิ่งครบวงจรของ Checkrace Co., Ltd.

---

## Executive Summary

- **Multi-page static site** (HTML + CSS + JS, ไม่ใช้ framework)
- **11 หน้า:** Home, Registration, Virtual Run, Timing, Foto, Merchandise, Dashboard, About, Portfolio, Contact, FAQ
- **4 ภาษา:** ไทย / English / 日本語 / 中文 (สลับได้ทันที)
- **Dashboard:** แสดง 26 งานปี 2026, นักวิ่งเป้าหมาย 100K, growth chart, service breakdown
- **Deploy:** Cloudflare Pages (auto-deploy ผ่าน GitHub)
- **CI:** Modern Minimal — ขาว, แดง (#E53935), Prompt font

---

## โครงสร้างไฟล์

```
Checkrace Web/
├── index.html              หน้าแรก
├── registration.html       ระบบรับสมัคร
├── virtual-run.html        Virtual Run Platform
├── timing.html             ระบบจับเวลา
├── foto.html               Checkrace Foto
├── merchandise.html        อุปกรณ์การแข่งขัน
├── dashboard.html          Dashboard ผลงาน
├── about.html              เกี่ยวกับเรา
├── portfolio.html          ผลงาน
├── contact.html            ติดต่อเรา
├── faq.html                คำถามที่พบบ่อย
├── css/
│   └── style.css           Stylesheet หลัก (รวม dashboard)
├── js/
│   ├── i18n.js             ระบบหลายภาษา 4 ภาษา
│   ├── main.js             Navigation, animations, counters
│   └── dashboard.js        Chart.js + event timeline
├── wrangler.toml           Cloudflare Pages config
├── .gitignore
├── DEPLOY.md               คู่มือ deploy ผ่าน Wrangler CLI
├── CLOUDFLARE_SETUP.md     คู่มือ deploy ผ่าน GitHub + Cloudflare
└── README.md
```

---

## รัน Local

เปิด `index.html` ใน browser ได้เลย — เป็น static site

หรือใช้ live server:
```bash
npx serve .
```

---

## Deploy

**แนะนำ:** GitHub + Cloudflare Pages (auto-deploy) → ดู `CLOUDFLARE_SETUP.md`

**ทางเลือก:** Wrangler CLI → ดู `DEPLOY.md`

---

## เทคโนโลยี

- HTML5 / CSS3 (Custom Properties) / Vanilla JS
- Chart.js 4.4 (CDN)
- Google Fonts: Prompt, Noto Sans JP, Noto Sans SC
- ไม่มี build step — push คือ deploy

---

© 2026 Checkrace Co., Ltd.
