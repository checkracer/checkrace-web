# Deploy Checkrace Web → Cloudflare Pages

## วิธีที่ 1: Wrangler CLI (แนะนำ — ไม่ต้อง GitHub)

### ขั้นตอนเดียว

1. เปิด Terminal / Command Prompt แล้ว cd เข้าโฟลเดอร์โปรเจค:

```bash
cd "C:\Users\along\OneDrive\Documents\Claude\Projects\Checkrace Web"
```

2. ติดตั้ง Wrangler (ถ้ายังไม่มี):

```bash
npm install -g wrangler
```

3. Login Cloudflare:

```bash
wrangler login
```

4. Deploy:

```bash
wrangler pages deploy ./ --project-name=checkrace-web
```

5. เสร็จ! เว็บจะขึ้นที่ `https://checkrace-web.pages.dev`

### ครั้งต่อไป (อัพเดทเว็บ)

แค่รัน command เดียว:

```bash
wrangler pages deploy ./ --project-name=checkrace-web
```

---

## วิธีที่ 2: Cloudflare Dashboard (ลาก Drop ไฟล์)

1. ไปที่ https://dash.cloudflare.com → Workers & Pages → Create
2. เลือก **Pages** → **Upload assets**
3. ตั้งชื่อ project: `checkrace-web`
4. ลากโฟลเดอร์ทั้งหมดมาวาง (หรือเลือกไฟล์)
5. กด **Deploy**
6. เสร็จ! ได้ URL `https://checkrace-web.pages.dev`

---

## เชื่อม Custom Domain (ภายหลัง)

เมื่อพร้อมใช้ domain จริง:

1. Cloudflare Dashboard → Pages → checkrace-web → Custom domains
2. เพิ่ม domain เช่น `www.checkrace.com` หรือ `web.checkrace.com`
3. Cloudflare จะตั้ง DNS ให้อัตโนมัติ

---

## โครงสร้างไฟล์

```
Checkrace Web/
├── index.html          ← หน้าแรก
├── registration.html   ← ระบบรับสมัคร
├── virtual-run.html    ← Virtual Run
├── timing.html         ← ระบบจับเวลา
├── foto.html           ← Checkrace Foto
├── merchandise.html    ← อุปกรณ์แข่งขัน
├── about.html          ← เกี่ยวกับเรา
├── portfolio.html      ← ผลงาน
├── contact.html        ← ติดต่อเรา
├── faq.html            ← คำถามที่พบบ่อย
├── css/style.css       ← Stylesheet
├── js/i18n.js          ← ระบบ 4 ภาษา
├── js/main.js          ← JavaScript
└── wrangler.toml       ← Cloudflare config
```
