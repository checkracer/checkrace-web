/* ============================================
   CHECKRACE — Rank Admin
   Curate data/rank-events.json (the Thailand Runner Rank registry):
   Checkrace group (from EVENT_META) + external events (RaceResult /
   MyLaps-Sportstats / other), criteria, with live RaceResult validation.
   Static site → edits are exported as a file to commit; no server write.
   ============================================ */

const RR_BASE = 'https://my.raceresult.com';
const TIMINGS = [
  { v: 'raceresult', label: 'RaceResult' },
  { v: 'mylaps',     label: 'MyLaps (Sportstats)' },
  { v: 'other',      label: 'อื่นๆ' }
];

const state = {
  raw: null,                 // original loaded JSON (to preserve unknown fields)
  criteria: { distances: ['42K','21K','10K','5K'], topN: 300, thaiCodes: ['THA','TH'] },
  exclude: new Set(),        // Checkrace event codes to hide
  ext: []                    // external events
};

// ---------- helpers ----------
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1900);
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function mapDist(cname) {
  const m = String(cname).match(/(\d+(?:\.\d+)?)/);
  if (!m) return '';
  const n = parseFloat(m[1]);
  if (n >= 40 && n <= 43) return '42K';
  if (n >= 20 && n <= 22) return '21K';
  if (n >= 9 && n <= 11) return '10K';
  if (n >= 4.5 && n <= 5.5) return '5K';
  return '';
}
function discoverList(cfg) {
  const lists = (cfg.TabConfig && cfg.TabConfig.Lists) || [];
  if (!lists.length) return '02-Results|Results';
  const score = (l) => {
    const n = String(l.Name); let s = 0;
    if (/overall/i.test(n)) s += 4;
    if (/results/i.test(n)) s += 2; else if (/result/i.test(n)) s += 1;
    if (/award|top\s*\d|age\s*group|gender|ceremony|\bTH\b/i.test(n)) s -= 5;
    return s;
  };
  const best = lists.slice().sort((a, b) => score(b) - score(a))[0];
  return best ? best.Name : '02-Results|Results';
}

// ---------- load ----------
async function load() {
  let reg = {};
  try { reg = await fetch('data/rank-events.json', { cache: 'no-store' }).then(r => r.json()); }
  catch (e) { console.warn('no existing registry, starting fresh'); }
  state.raw = reg;
  if (reg.criteria) state.criteria = Object.assign(state.criteria, reg.criteria);
  state.exclude = new Set((reg.checkraceExclude || []).map(c => String(c).toUpperCase()));
  state.ext = (reg.externalEvents || reg.raceResultEvents || []).map(e => ({
    name: e.name || '',
    timing: (e.timing || (e.raceResultId ? 'raceresult' : 'raceresult')).toLowerCase(),
    eventId: String(e.raceResultId || e.eventId || ''),
    listname: e.listname || '',
    year: e.year || '',
    province: e.province || '',
    distances: Array.isArray(e.distances) ? e.distances.slice() : (e.distances ? String(e.distances).split(/[\/,]/).map(s=>s.trim()) : []),
    included: e.included !== false,
    status: ''
  }));
}

// ---------- criteria UI ----------
function renderCriteria() {
  document.querySelectorAll('#critDist input').forEach(cb => {
    cb.checked = state.criteria.distances.includes(cb.value);
    cb.onchange = () => {
      const v = cb.value;
      const i = state.criteria.distances.indexOf(v);
      if (cb.checked && i < 0) state.criteria.distances.push(v);
      if (!cb.checked && i >= 0) state.criteria.distances.splice(i, 1);
    };
  });
  const topN = document.getElementById('critTopN');
  topN.value = state.criteria.topN;
  topN.onchange = () => state.criteria.topN = parseInt(topN.value, 10) || 300;
  const thai = document.getElementById('critThai');
  thai.value = (state.criteria.thaiCodes || []).join(', ');
  thai.onchange = () => state.criteria.thaiCodes = thai.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
}

// ---------- Checkrace group ----------
function checkraceEvents() {
  const META = (window.RACE && RACE.EVENT_META) || {};
  return Object.keys(META).map(code => ({
    code, name: META[code].name, year: META[code].year, series: META[code].series
  })).sort((a, b) => (b.year - a.year) || a.code.localeCompare(b.code));
}
function renderCheckrace() {
  const body = document.getElementById('crBody');
  const all = checkraceEvents();
  const q = (document.getElementById('crSearch').value || '').toLowerCase();
  const list = q ? all.filter(e => (e.code + ' ' + e.name + ' ' + e.series).toLowerCase().includes(q)) : all;
  body.innerHTML = list.map(e => {
    const on = !state.exclude.has(e.code.toUpperCase());
    return '<tr>'
      + '<td><input type="checkbox" data-cr="' + esc(e.code) + '"' + (on ? ' checked' : '') + '></td>'
      + '<td><b>' + esc(e.code) + '</b></td><td>' + esc(e.name) + '</td>'
      + '<td>' + esc(e.year) + '</td><td>' + esc(e.series) + '</td></tr>';
  }).join('');
  const updateCount = () => {
    document.getElementById('crCount').textContent = all.length + ' งาน · ซ่อน ' + state.exclude.size;
  };
  body.querySelectorAll('input[data-cr]').forEach(cb => {
    cb.onchange = () => {
      const code = cb.getAttribute('data-cr').toUpperCase();
      if (cb.checked) state.exclude.delete(code); else state.exclude.add(code);
      updateCount();
    };
  });
  updateCount();
}

// ---------- External group ----------
function renderExt() {
  const wrap = document.getElementById('extList');
  if (!state.ext.length) {
    wrap.innerHTML = '<p class="mini" style="margin:0 0 12px">ยังไม่มีงานนอก — กด "เพิ่มงานนอก" เพื่อเริ่ม</p>';
    return;
  }
  wrap.innerHTML = state.ext.map((e, i) => {
    const opts = TIMINGS.map(t => '<option value="' + t.v + '"' + (e.timing === t.v ? ' selected' : '') + '>' + t.label + '</option>').join('');
    const statusPill = e.status === 'ok' ? '<span class="pill ok">✓ ตรวจแล้ว</span>'
      : e.status === 'err' ? '<span class="pill err">✗ ไม่พบ</span>'
      : e.status === 'loading' ? '<span class="pill warn">…</span>' : '';
    const isRR = e.timing === 'raceresult';
    return '<div class="ev-card" data-i="' + i + '">'
      + '<div class="grid">'
        + '<div><label class="fld">ชื่องาน</label><input class="t" data-f="name" value="' + esc(e.name) + '" placeholder="เช่น Bangkok Marathon 2025"></div>'
        + '<div><label class="fld">ระบบจับเวลา</label><select class="t" data-f="timing">' + opts + '</select></div>'
        + '<div><label class="fld">Event ID</label><input class="t" data-f="eventId" value="' + esc(e.eventId) + '" placeholder="' + (isRR ? 'เช่น 345406' : 'id ของระบบ') + '"></div>'
        + '<div><label class="fld">ปี</label><input class="t" data-f="year" value="' + esc(e.year) + '" placeholder="2025"></div>'
      + '</div>'
      + '<div class="grid2">'
        + '<div><label class="fld">ระยะ (คั่นด้วย ,)</label><input class="t" data-f="distances" value="' + esc((e.distances||[]).join(', ')) + '" placeholder="42K, 21K, 10K"></div>'
        + '<div><label class="fld">จังหวัด</label><input class="t" data-f="province" value="' + esc(e.province) + '" placeholder="กรุงเทพฯ"></div>'
        + '<div class="ev-actions">'
          + '<label style="font-weight:600;font-size:.85rem;display:flex;gap:6px;align-items:center"><input type="checkbox" data-f="included"' + (e.included ? ' checked' : '') + '> แสดง</label>'
          + (isRR ? '<button class="btn-sm" data-act="test">ทดสอบดึง</button>' : '')
          + '<button class="btn-x" data-act="del">ลบ</button>'
        + '</div>'
      + '</div>'
      + '<div style="margin-top:8px;display:flex;gap:10px;align-items:center">' + statusPill
        + (e.listname ? '<span class="mini">list: <b>' + esc(e.listname) + '</b></span>' : '')
        + (e.note ? '<span class="mini">' + esc(e.note) + '</span>' : '')
      + '</div>'
    + '</div>';
  }).join('');

  wrap.querySelectorAll('.ev-card').forEach(card => {
    const i = +card.getAttribute('data-i');
    card.querySelectorAll('[data-f]').forEach(inp => {
      const f = inp.getAttribute('data-f');
      const handler = () => {
        if (f === 'included') state.ext[i].included = inp.checked;
        else if (f === 'distances') state.ext[i].distances = inp.value.split(',').map(s => s.trim()).filter(Boolean);
        else state.ext[i][f] = inp.value;
        if (f === 'timing') renderExt();   // toggle test button visibility
      };
      inp.onchange = handler;
      if (inp.tagName === 'INPUT' && inp.type !== 'checkbox') inp.oninput = handler;
    });
    const testBtn = card.querySelector('[data-act="test"]');
    if (testBtn) testBtn.onclick = () => testRR(i);
    card.querySelector('[data-act="del"]').onclick = () => {
      if (confirm('ลบงานนี้?')) { state.ext.splice(i, 1); renderExt(); }
    };
  });
}

async function testRR(i) {
  const ev = state.ext[i];
  const id = String(ev.eventId || '').trim();
  if (!id) { toast('กรอก Event ID ก่อน'); return; }
  ev.status = 'loading'; ev.note = ''; renderExt();
  try {
    const cfg = await fetch(`${RR_BASE}/${id}/results/config?lang=en`, { cache: 'no-store' }).then(r => r.json());
    const name = cfg.eventname || cfg.EventName || cfg.name || '';
    const contests = cfg.contests || cfg.Contests || {};
    const dists = [...new Set(Object.values(contests).map(mapDist).filter(Boolean))];
    ev.status = 'ok';
    ev.listname = discoverList(cfg);
    if (!ev.name && name) ev.name = name;
    if (!ev.distances || !ev.distances.length) ev.distances = dists;
    if (!ev.year) { const ym = String(name).match(/20\d\d/); if (ym) ev.year = ym[0]; }
    ev.note = 'พบ: ' + esc(name) + ' · ระยะ ' + (dists.join('/') || '—');
    toast('ดึงได้: ' + name);
  } catch (e) {
    ev.status = 'err';
    ev.note = 'ดึงไม่สำเร็จ — ตรวจ Event ID หรือผลยังไม่เปิดสาธารณะ';
    toast('ดึงไม่สำเร็จ');
  }
  renderExt();
}

function addExt() {
  state.ext.push({ name: '', timing: 'raceresult', eventId: '', listname: '', year: '', province: '', distances: [], included: true, status: '' });
  renderExt();
}

// ---------- export ----------
function buildJSON() {
  const reg = Object.assign({}, state.raw);
  reg._comment = (state.raw && state.raw._comment) ||
    'Registry for Thailand Runner Rank. Edit via rank-admin.html.';
  reg.checkraceApi = state.raw && state.raw.checkraceApi;
  reg.raceResultBase = (state.raw && state.raw.raceResultBase) || RR_BASE;
  reg.raceResultList = (state.raw && state.raw.raceResultList) || '02-Results|Results';
  reg.criteria = {
    distances: state.criteria.distances,
    topN: state.criteria.topN,
    thaiCodes: state.criteria.thaiCodes
  };
  reg.checkraceExclude = [...state.exclude];
  reg.externalEvents = state.ext.map(e => {
    const o = { name: e.name, timing: e.timing };
    if (e.timing === 'raceresult') { o.raceResultId = String(e.eventId || ''); if (e.listname) o.listname = e.listname; }
    else o.eventId = String(e.eventId || '');
    if (e.year) o.year = isNaN(+e.year) ? e.year : +e.year;
    if (e.province) o.province = e.province;
    if (e.distances && e.distances.length) o.distances = e.distances;
    o.included = e.included !== false;
    return o;
  });
  // drop legacy key
  delete reg.raceResultEvents;
  return JSON.stringify(reg, null, 2);
}
function refreshJson() { document.getElementById('jsonOut').value = buildJSON(); }

function download() {
  const blob = new Blob([buildJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rank-events.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
  toast('ดาวน์โหลดแล้ว — วางทับใน data/');
}
async function copyJson() {
  try { await navigator.clipboard.writeText(buildJSON()); toast('คัดลอกแล้ว'); }
  catch (e) { document.getElementById('jsonOut').select(); document.execCommand('copy'); toast('คัดลอกแล้ว'); }
}

// ---------- init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await load();
  renderCriteria();
  renderCheckrace();
  renderExt();
  refreshJson();
  document.getElementById('crSearch').oninput = renderCheckrace;
  document.getElementById('crAll').onclick = () => { state.exclude.clear(); renderCheckrace(); };
  document.getElementById('crNone').onclick = () => { checkraceEvents().forEach(e => state.exclude.add(e.code.toUpperCase())); renderCheckrace(); };
  document.getElementById('extAdd').onclick = addExt;
  document.getElementById('refreshJson').onclick = refreshJson;
  document.getElementById('btnDownload').onclick = download;
  document.getElementById('btnCopy').onclick = copyJson;
});
