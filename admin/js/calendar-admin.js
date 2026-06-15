/* Calendar admin — Event Manager + Editor + Organizer/Venue masters.
   Behind Cloudflare Access (/admin/* + /api/admin/*). Ported from running-calendar-module skill. */
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const PKG = [['free','Free'],['basic','Basic'],['certified','Certified ✓'],['premium','Premium ★']];
const TYPES = ['Road','Trail','Virtual'];
const STATUSES = ['Coming Soon','Early Bird','เปิดรับสมัคร','ปิดรับสมัคร'];
const CATS = [['','— ไม่ระบุ —'],['standard','Standard Race'],['event','Event Run'],['charity','Charity']];

let EVENTS = [], ORGS = [], VENUES = [];
let editingEvent = null, editingOrg = null, editingVenue = null;

function msg(t, ok) { const m = $('msg'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'err'); setTimeout(() => { m.className = 'msg'; }, 3500); }

async function api(path, opt) {
  const r = await fetch('/api' + path, opt);
  if (r.status === 401 || r.status === 403) { msg('ไม่ได้รับสิทธิ์ — ต้องเข้าผ่าน Cloudflare Access', false); throw new Error('unauth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { msg(j.error || ('HTTP ' + r.status), false); throw new Error(j.error || r.status); }
  return j;
}
const opt = (m, body) => ({ method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/* ---------- tabs ---------- */
document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
  ['events','orgs','venues'].forEach((t) => $('tab-' + t).style.display = t === b.dataset.tab ? 'grid' : 'none');
});

/* ---------- loads ---------- */
async function loadEvents() { EVENTS = (await api('/admin/events?status=all')).events || []; renderEventList(); }
async function loadOrgs() { ORGS = (await api('/admin/organizers')).organizers || []; renderOrgList(); }
async function loadVenues() { VENUES = (await api('/admin/venues')).venues || []; renderVenueList(); }

/* ====================== EVENTS ====================== */
window.renderEventList = function () {
  const q = ($('evSearch').value || '').toLowerCase();
  const rows = EVENTS.filter((e) => !q || (e.name || '').toLowerCase().includes(q) || (e.province || '').toLowerCase().includes(q));
  $('evList').innerHTML = rows.map((e) => `
    <div class="row-item ${editingEvent && editingEvent.id === e.id ? 'active' : ''}" onclick="editEvent('${e.id}')">
      <div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name)}</b>
        <small>${esc((e.date || '').slice(0, 10))} · ${esc(e.province || '-')}</small></div>
      <div style="text-align:right;flex-shrink:0">
        <span class="pill ${e.visible ? 'on' : 'off'}">${e.visible ? 'เปิด' : 'ปิด'}</span>
        <small>${esc(e.package || 'free')}</small></div>
    </div>`).join('') || '<p class="muted">ยังไม่มีงาน</p>';
};

window.newEvent = function () { editingEvent = { type: 'Road', status: 'เปิดรับสมัคร', package: 'free', visible: 1 }; renderEventEditor(); renderEventList(); };
window.editEvent = function (id) { editingEvent = { ...EVENTS.find((e) => e.id === id) }; renderEventEditor(); renderEventList(); };

function masterSelect(idAttr, items, val, kindFilter) {
  const list = kindFilter ? items.filter((o) => !o.kind || o.kind === kindFilter || true) : items;
  const opts = ['<option value="">— ไม่ระบุ —</option>']
    .concat(list.map((o) => `<option value="${o.id}" ${val === o.id ? 'selected' : ''}>${esc(o.name)}</option>`))
    .join('');
  return `<div class="ms-wrap"><select id="${idAttr}">${opts}</select><button type="button" class="ms-add" onclick="addMaster('${idAttr}')">＋</button></div>`;
}

function renderEventEditor() {
  const e = editingEvent; if (!e) return;
  const f = (k) => esc(e[k] || '');
  $('evEditor').innerHTML = `
    <h3 style="margin:0 0 6px">${e.id ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}</h3>
    <label>ชื่องาน *</label><input id="f_name" value="${f('name')}">
    <div class="row3">
      <div><label>วันแข่ง *</label><input id="f_date" type="date" value="${(e.date||'').slice(0,10)}"></div>
      <div><label>เปิดรับสมัคร</label><input id="f_register_open" type="date" value="${(e.register_open||'').slice(0,10)}"></div>
      <div><label>ปิดรับสมัคร</label><input id="f_register_close" type="date" value="${(e.register_close||'').slice(0,10)}"></div>
    </div>
    <div class="row2">
      <div><label>สถานที่</label>${masterSelect('f_venue_id', VENUES, e.venue_id)}</div>
      <div><label>จังหวัด</label><input id="f_province" value="${f('province')}"></div>
    </div>
    <div class="row3">
      <div><label>ระยะวิ่ง</label><input id="f_distance" value="${f('distance')}" placeholder="5/10/21K"></div>
      <div><label>ประเภท</label><select id="f_type">${TYPES.map((t)=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div><label>สถานะ</label><select id="f_status">${STATUSES.map((s)=>`<option ${e.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div><label>ผู้จัดงาน / เจ้าของงาน</label>${masterSelect('f_host_id', ORGS, e.host_id, 'owner')}</div>
      <div><label>ออแกไนเซอร์</label>${masterSelect('f_organizer_id', ORGS, e.organizer_id, 'organizer')}</div>
    </div>
    <div class="row3">
      <div><label>ค่าสมัคร</label><input id="f_fee" value="${f('fee')}" placeholder="400-1000"></div>
      <div><label>เว็บไซต์งาน</label><input id="f_website" value="${f('website')}" placeholder="https://"></div>
      <div><label>Facebook</label><input id="f_facebook_link" value="${f('facebook_link')}" placeholder="https://facebook.com/"></div>
    </div>
    <div class="row2">
      <div><label>ลิงก์สมัคร</label><input id="f_register_link" value="${f('register_link')}" placeholder="https://"></div>
      <div><label>รูปปก (URL)</label><input id="f_cover_image_url" value="${f('cover_image_url')}"></div>
    </div>
    <div class="row3">
      <div><label>เบอร์ติดต่อ</label><input id="f_telephone" value="${f('telephone')}"></div>
      <div><label>อีเมล</label><input id="f_email" value="${f('email')}"></div>
      <div><label>ประเภทงาน (Badge)</label><select id="f_race_category">${CATS.map(([v,l])=>`<option value="${v}" ${e.race_category===v?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="row3">
      <div><label>Series (Annual Race)</label><input id="f_series" value="${f('series')}" placeholder="เว้นว่าง = งานครั้งเดียว"></div>
      <div><label>Package</label><select id="f_package">${PKG.map(([v,l])=>`<option value="${v}" ${(e.package||'free')===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div><label>แสดงบนปฏิทิน</label><select id="f_visible"><option value="1" ${e.visible!==0?'selected':''}>เปิด</option><option value="0" ${e.visible===0?'selected':''}>ปิด</option></select></div>
    </div>
    <label>หมายเหตุ</label><textarea id="f_notes">${f('notes')}</textarea>
    <div class="actions">
      <button class="btn btn-red" onclick="saveEvent()">💾 บันทึก</button>
      ${e.id ? '<button class="btn btn-ghost" onclick="dupEvent()">ทำสำเนา</button><button class="btn btn-danger" onclick="delEvent()">ลบ</button>' : ''}
    </div>`;
}

function collectEvent() {
  const g = (k) => { const el = $('f_' + k); return el ? el.value : undefined; };
  const o = {};
  ['name','date','register_open','register_close','venue_id','province','distance','type','status','host_id','organizer_id','fee','website','facebook_link','register_link','cover_image_url','telephone','email','race_category','series','package','notes'].forEach((k) => { o[k] = g(k) || null; });
  o.visible = +g('visible');
  return o;
}
window.saveEvent = async function () {
  const body = collectEvent();
  if (!body.name || !body.date) return msg('ต้องระบุชื่องาน + วันที่', false);
  try {
    if (editingEvent.id) await api('/admin/events?id=' + encodeURIComponent(editingEvent.id), opt('PATCH', body));
    else await api('/admin/events', opt('POST', body));
    msg('บันทึกแล้ว', true); await loadEvents();
    editingEvent = EVENTS.find((e) => e.name === body.name && (e.date || '').slice(0,10) === body.date) || null;
    editingEvent ? renderEventEditor() : ($('evEditor').innerHTML = '<p class="muted">บันทึกแล้ว</p>');
    renderEventList();
  } catch (e) {}
};
window.delEvent = async function () {
  if (!confirm('ลบงาน "' + editingEvent.name + '" ?')) return;
  try { await api('/admin/events?id=' + encodeURIComponent(editingEvent.id), { method: 'DELETE' }); msg('ลบแล้ว', true); editingEvent = null; $('evEditor').innerHTML = '<p class="muted">เลือกงาน</p>'; await loadEvents(); } catch (e) {}
};
window.dupEvent = async function () {
  const body = collectEvent(); body.name = (body.name || 'งาน') + ' (copy)'; body.visible = 0;
  try { await api('/admin/events', opt('POST', body)); msg('ทำสำเนาแล้ว (ซ่อนไว้)', true); await loadEvents(); } catch (e) {}
};

/* ---------- MasterSelect inline add ---------- */
window.addMaster = async function (selId) {
  const name = (prompt('ชื่อใหม่:') || '').trim(); if (!name) return;
  const isVenue = selId === 'f_venue_id';
  try {
    if (isVenue) { const v = await api('/admin/venues', opt('POST', { name })); await loadVenues(); rebuildMasterSel(selId, VENUES, v.id); }
    else {
      const kind = selId === 'f_host_id' ? 'owner' : 'organizer';
      const o = await api('/admin/organizers', opt('POST', { name, kind })); await loadOrgs(); rebuildMasterSel(selId, ORGS, o.id);
    }
    msg('เพิ่มแล้ว', true);
  } catch (e) {}
};
function rebuildMasterSel(selId, items, selectId) {
  const sel = $(selId); if (!sel) return;
  sel.innerHTML = '<option value="">— ไม่ระบุ —</option>' + items.map((o) => `<option value="${o.id}" ${o.id === selectId ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
}

/* ====================== ORGANIZERS ====================== */
function renderOrgList() {
  $('orgList').innerHTML = ORGS.map((o) => `
    <div class="row-item ${editingOrg && editingOrg.id === o.id ? 'active' : ''}" onclick="editOrg('${o.id}')">
      <div style="min-width:0"><b>${esc(o.name)}</b><small>${o.kind === 'owner' ? 'เจ้าของงาน' : 'ออแกไนเซอร์'} · ${o.event_count || 0} งาน</small></div>
    </div>`).join('') || '<p class="muted">ยังไม่มีรายการ</p>';
}
window.newOrg = function () { editingOrg = { kind: 'organizer' }; renderOrgEditor(); };
window.editOrg = function (id) { editingOrg = { ...ORGS.find((o) => o.id === id) }; renderOrgEditor(); renderOrgList(); };
function renderOrgEditor() {
  const o = editingOrg; const f = (k) => esc(o[k] || '');
  $('orgEditor').innerHTML = `
    <h3 style="margin:0 0 6px">${o.id ? 'แก้ไข' : 'เพิ่ม'}ผู้จัด/ออแกไนเซอร์</h3>
    <label>ชื่อ *</label><input id="o_name" value="${f('name')}">
    <div class="row2">
      <div><label>ประเภท</label><select id="o_kind"><option value="organizer" ${o.kind!=='owner'?'selected':''}>ออแกไนเซอร์ (ผู้รับจัดงาน)</option><option value="owner" ${o.kind==='owner'?'selected':''}>เจ้าของงาน (รร./รพ./เทศบาล/มูลนิธิ)</option></select></div>
      <div><label>โลโก้ (URL)</label><input id="o_logo_url" value="${f('logo_url')}"></div>
    </div>
    <div class="row2"><div><label>Facebook</label><input id="o_facebook" value="${f('facebook')}"></div><div><label>เว็บไซต์</label><input id="o_website" value="${f('website')}"></div></div>
    <div class="row2"><div><label>โทร</label><input id="o_phone" value="${f('phone')}"></div><div><label>อีเมล</label><input id="o_email" value="${f('email')}"></div></div>
    <label>หมายเหตุ</label><textarea id="o_notes">${f('notes')}</textarea>
    <div class="actions"><button class="btn btn-red" onclick="saveOrg()">💾 บันทึก</button>${o.id ? '<button class="btn btn-danger" onclick="delOrg()">ลบ</button>' : ''}</div>`;
}
window.saveOrg = async function () {
  const g = (k) => $('o_' + k).value;
  const body = { name: g('name'), kind: g('kind'), logo_url: g('logo_url'), facebook: g('facebook'), website: g('website'), phone: g('phone'), email: g('email'), notes: g('notes') };
  if (!body.name.trim()) return msg('ใส่ชื่อ', false);
  try { if (editingOrg.id) await api('/admin/organizers?id=' + encodeURIComponent(editingOrg.id), opt('PATCH', body)); else await api('/admin/organizers', opt('POST', body)); msg('บันทึกแล้ว', true); editingOrg = null; $('orgEditor').innerHTML = '<p class="muted">บันทึกแล้ว</p>'; await loadOrgs(); } catch (e) {}
};
window.delOrg = async function () { if (!confirm('ลบ "' + editingOrg.name + '" ? (งานที่ผูกไว้จะไม่ถูกลบ)')) return; try { await api('/admin/organizers?id=' + encodeURIComponent(editingOrg.id), { method: 'DELETE' }); editingOrg = null; $('orgEditor').innerHTML = '<p class="muted">เลือกรายการ</p>'; await loadOrgs(); } catch (e) {} };

/* ====================== VENUES ====================== */
const VTYPES = [['park','สวนสาธารณะ'],['stadium','สนามกีฬา'],['landmark','แลนด์มาร์ก'],['other','อื่นๆ']];
function renderVenueList() {
  $('venueList').innerHTML = VENUES.map((v) => `
    <div class="row-item ${editingVenue && editingVenue.id === v.id ? 'active' : ''}" onclick="editVenue('${v.id}')">
      <div style="min-width:0"><b>${esc(v.name)}</b><small>${esc(v.province || '-')} · ${v.event_count || 0} งาน</small></div>
    </div>`).join('') || '<p class="muted">ยังไม่มีสถานที่</p>';
}
window.newVenue = function () { editingVenue = { type: 'park' }; renderVenueEditor(); };
window.editVenue = function (id) { editingVenue = { ...VENUES.find((v) => v.id === id) }; renderVenueEditor(); renderVenueList(); };
function renderVenueEditor() {
  const v = editingVenue; const f = (k) => esc(v[k] || '');
  $('venueEditor').innerHTML = `
    <h3 style="margin:0 0 6px">${v.id ? 'แก้ไข' : 'เพิ่ม'}สถานที่</h3>
    <label>ชื่อสถานที่ *</label><input id="v_name" value="${f('name')}">
    <div class="row2"><div><label>จังหวัด</label><input id="v_province" value="${f('province')}"></div>
      <div><label>ประเภท</label><select id="v_type">${VTYPES.map(([val,l])=>`<option value="${val}" ${v.type===val?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <label>ภาค</label><input id="v_region" value="${f('region')}">
    <label>หมายเหตุ</label><textarea id="v_notes">${f('notes')}</textarea>
    <div class="actions"><button class="btn btn-red" onclick="saveVenue()">💾 บันทึก</button>${v.id ? '<button class="btn btn-danger" onclick="delVenue()">ลบ</button>' : ''}</div>`;
}
window.saveVenue = async function () {
  const g = (k) => $('v_' + k).value;
  const body = { name: g('name'), province: g('province'), type: g('type'), region: g('region'), notes: g('notes') };
  if (!body.name.trim()) return msg('ใส่ชื่อ', false);
  try { if (editingVenue.id) await api('/admin/venues?id=' + encodeURIComponent(editingVenue.id), opt('PATCH', body)); else await api('/admin/venues', opt('POST', body)); msg('บันทึกแล้ว', true); editingVenue = null; $('venueEditor').innerHTML = '<p class="muted">บันทึกแล้ว</p>'; await loadVenues(); } catch (e) {}
};
window.delVenue = async function () { if (!confirm('ลบ "' + editingVenue.name + '" ?')) return; try { await api('/admin/venues?id=' + encodeURIComponent(editingVenue.id), { method: 'DELETE' }); editingVenue = null; $('venueEditor').innerHTML = '<p class="muted">เลือกรายการ</p>'; await loadVenues(); } catch (e) {} };

/* ---------- boot ---------- */
fetch('/cdn-cgi/access/get-identity').then((r) => r.ok ? r.json() : null).then((j) => { if (j && j.email) $('who').textContent = j.email; }).catch(() => {});
(async () => { try { await loadEvents(); await loadOrgs(); await loadVenues(); } catch (e) {} })();
