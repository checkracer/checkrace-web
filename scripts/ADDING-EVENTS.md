# เพิ่มงานนอกเข้า Thailand Runner Rank (Official)

ขั้นตอนปลอดภัยสำหรับ "ทยอยเพิ่มงานมาตรฐาน" ทีละงาน พร้อมตรวจความผิดปกติก่อนเชื่อ

## 1. หา Event ID
- **RaceResult:** เปิดหน้าผลงาน → URL คือ `https://my.raceresult.com/<EventID>/...`
- ใช้หน้า admin `rank-admin.html` ปุ่ม **"ทดสอบดึง"** เพื่อ validate + auto-fill ชื่อ/ระยะ/listname

## 2. เพิ่มใน `data/rank-events.json` → `externalEvents[]`
```json
{ "code": "XXX-25", "name": "...", "timing": "raceresult",
  "raceResultId": "123456", "year": 2025, "province": "...",
  "distances": ["42K"], "included": true }
```
> ⚠️ อย่าใส่งานที่ Checkrace จับเวลาเอง (อยู่ในฐานอยู่แล้ว) จะนับซ้ำ

## 3. Build แล้ว **อ่าน health line + ⚠️ ของแต่ละงาน**
```
node scripts/build-rank.js            # ดึงสด (Checkrace ~57s + งานนอก)
# หรือใช้ dump เร็วกว่า:
node scripts/build-rank.js <checkrace-dump.json>
```
ทุกงานจะพิมพ์:
```
+ RaceResult XXX-25: 9736 finishers | dist 42K:9736 | nat 100% | fastest 42K 2:17:52
```
และสรุป `===== DATA QUALITY =====` ท้าย build

### ⚠️ ความหมายของ warning
| Warning | แปลว่า | ต้องทำ |
|---|---|---|
| `0 finishers parsed` | list/format ผิด | เช็ค list ที่ pickList เลือก, อาจต้องระบุ `listname` เอง |
| `no nationality parsed` | list ไม่มี column สัญชาติ | นักวิ่งไทยพึ่ง cross-event reconciliation; foreign → all-board (ยอมรับได้) |
| `low nationality coverage` | บางแถวไม่มีธง | เหมือนข้างบน |
| `N rows unmapped distance` | contest name แปลกๆ | เพิ่ม keyword ใน `distFromName`/`keyHints` |
| `impossibly fast Xkm` | เวลาเร็วกว่า WR = **ระยะ label ผิด / parse ผิด** | เจาะ field ของงานนั้น (ดู §5) |

## 4. ตรวจ outlier เชิงลึก
```
node scripts/audit-rank.js <checkrace-dump.json>
```
รายงาน: สัญชาติไม่สอดคล้อง, mis-key candidates (ชื่อต่างชาติติดบอร์ดไทย), chip/gun glitches, DSQ/DNF

## 5. ถ้า format แปลก (เวลา/สัญชาติ parse ไม่ได้) — debug field
```bash
node -e 'const https=require("https");const g=u=>new Promise(r=>{https.get(u,x=>{let s="";x.on("data",d=>s+=d);x.on("end",()=>r(s))})});(async()=>{const id="EVENTID";const c=JSON.parse(await g(`https://my.raceresult.com/${id}/results/config?lang=en`));console.log((c.TabConfig.Lists||[]).map(l=>l.Name+" (C="+l.Contest+")"));})()'
```
ดู DataFields + ROW0 ของ list ที่เลือก แล้วเทียบกับที่ `fetchRaceResult` รองรับ:
- **chip:** NetTime / Finish.CHIP / ChipTime / `TIME2` (primeworks/timit)
- **gun:** Finish.GUN / GunTime / TimeOrStatus / `TIME1`
- **สัญชาติ:** NATION.IOCNAME / NATION.FLAG / **CustomFlag** (flag เป็น URL)
- **เพศ:** จาก group key (MALE/FEMALE) หรือ age-group ("Male 30-34")
- **DNF:** สแกนทุก cell หา `DNF/DSQ/DNS/DQ-` → skip
- ข้าม field ที่เป็น formula (มี `[ ] ( )`)

ถ้าเจอ field ชื่อใหม่ → เพิ่มใน `idxLike`/`idxExact` ใน `scripts/build-rank.js`

## 6. แก้สัญชาติคีย์ผิด (ต่างชาติติดบอร์ดไทย)
- คนเดียวกันหลายสนาม → cross-event majority แก้อัตโนมัติ
- ต่างชาติคีย์ผิด**ทุก**สนาม → เพิ่มใน `rank-events.json` → `natOverrides`: `{"Full Name": "KEN"}`

## 7. Deploy
```
git add data/rank-events.json data/rankings.json && git commit -m "Add <event>" && git push
```
Cloudflare auto-deploy ~30s → เช็ค https://checkrace-web.pages.dev/thailand-rank
