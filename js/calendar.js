/* Public running calendar — fetches /api/events and renders cards with month/week/type filters.
   Ported from the running-calendar-module skill (portable vanilla-JS helpers). */
(function () {
  const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const RACE_CATEGORIES = {
    standard: { label: 'Standard Race', cls: 'bdg-blue' },
    event:    { label: 'Event Run',     cls: 'bdg-violet' },
    charity:  { label: 'Charity',       cls: 'bdg-rose' },
  };
  const pkgCls = (p) => ({ premium:'bdg-violet', certified:'bdg-amber', basic:'bdg-sky' }[String(p||'').toLowerCase()] || 'bdg-slate');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const ymd = (s) => String(s || '').slice(0, 10);
  const bkkToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

  function formatThaiDate(iso) {
    const d = new Date(ymd(iso) + 'T00:00:00Z');
    if (isNaN(d.getTime())) return iso || '-';
    return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${(d.getUTCFullYear() + 543).toString().slice(2)}`;
  }
  function shiftYmd(s, days) {
    const d = new Date(ymd(s) + 'T00:00:00Z'); if (isNaN(d.getTime())) return s;
    d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
  }
  function effectiveStatus(ev) {
    if (ev.status === 'ปิดรับสมัคร') return 'ปิดรับสมัคร';
    const today = bkkToday(), close = ymd(ev.register_close), date = ymd(ev.date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(close)) { if (today > close) return 'ปิดรับสมัคร'; }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && today >= shiftYmd(date, -14)) return 'ปิดรับสมัคร';
    return ev.status || 'เปิดรับสมัคร';
  }
  function hostOrganizerLines(ev) {
    const host = (ev.host_name || '').trim();
    let org = (ev.organizer_name || '').trim();
    if (!host && !org && ev.promoter) org = String(ev.promoter).trim();
    if (host && org) {
      if (host.toLowerCase() === org.toLowerCase()) return [{ l: 'ผู้จัดงานและออแกไนเซอร์', v: host }];
      return [{ l: 'เจ้าของงาน', v: host }, { l: 'ออแกไนเซอร์', v: org }];
    }
    if (host) return [{ l: 'เจ้าของงาน', v: host }];
    if (org) return [{ l: 'ออแกไนเซอร์', v: org }];
    return [];
  }

  let ALL = [];
  const state = { month: 'all', week: 'all', type: '' };

  function card(ev, isPast) {
    const cat = RACE_CATEGORIES[ev.race_category];
    const badges = [];
    if (cat) badges.push(`<span class="bdg ${cat.cls}">${cat.label}</span>`);
    if (ev.series) badges.push('<span class="bdg bdg-emerald">Annual Race</span>');
    badges.push(`<span class="bdg ${pkgCls(ev.package)}">${esc((ev.package || 'free').toUpperCase())}</span>`);
    if (ev.distance) badges.push(`<span class="bdg bdg-slate">${esc(ev.distance)}</span>`);
    const st = effectiveStatus(ev);
    badges.push(`<span class="bdg ${st === 'ปิดรับสมัคร' ? 'bdg-rose' : 'bdg-green'}">${esc(st)}</span>`);
    if (ev.source === 'wnd') badges.push('<span class="bdg bdg-slate" title="ข้อมูลจากปฏิทิน วิ่งไหนดี">via วิ่งไหนดี</span>');

    const org = hostOrganizerLines(ev).map((o) => `<span>${esc(o.l)}: <b style="color:var(--cr-gray-700)">${esc(o.v)}</b></span>`).join('');
    const links = [];
    if (ev.website) links.push(`<a href="${esc(ev.website)}" target="_blank" rel="noopener">🌐 เว็บไซต์</a>`);
    if (ev.facebook_link) links.push(`<a href="${esc(ev.facebook_link)}" target="_blank" rel="noopener" style="color:#1877f2">f Facebook</a>`);
    if (ev.register_link && ev.register_link !== '#') links.push(`<a href="${esc(ev.register_link)}" target="_blank" rel="noopener">สมัคร →</a>`);

    const thumb = ev.cover_image_url
      ? `<img class="ev-thumb" src="${esc(ev.cover_image_url)}" alt="" loading="lazy">`
      : '<div class="ev-thumb ph">🏃</div>';
    const place = `${ev.venue ? esc(ev.venue) + ', ' : ''}${esc(ev.province || '-')}`;

    return `<div class="ev-card${isPast ? ' past' : ''}">${thumb}
      <div class="ev-body">
        <p class="ev-name">${esc(ev.name)}</p>
        <div class="ev-meta"><span>📅 ${formatThaiDate(ev.date)}</span><span>📍 ${place}</span></div>
        <div class="ev-badges">${badges.join('')}</div>
        ${org ? `<div class="ev-org">🏢 ${org}</div>` : ''}
        ${links.length ? `<div class="ev-links">${links.join('')}</div>` : ''}
      </div></div>`;
  }

  function monthKey(ev) { return ymd(ev.date).slice(0, 7); } // YYYY-MM

  function buildFilters() {
    const months = [...new Set(ALL.map(monthKey).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
    const cur = bkkToday().slice(0, 7);
    if (state.month === 'all' && months.includes(cur)) state.month = cur;
    const mWrap = document.getElementById('calMonths');
    mWrap.innerHTML = `<button data-month="all"${state.month === 'all' ? ' class="active"' : ''}>ทุกเดือน</button>` +
      months.map((m) => {
        const [y, mo] = m.split('-');
        return `<button data-month="${m}"${state.month === m ? ' class="active"' : ''}>${THAI_MONTHS[+mo - 1]} ${(+y + 543).toString().slice(2)}</button>`;
      }).join('');
    const wWrap = document.getElementById('calWeeks');
    wWrap.style.display = state.month === 'all' ? 'none' : '';
    wWrap.innerHTML = ['all','1','2','3','4'].map((w) =>
      `<button data-week="${w}"${state.week === w ? ' class="active"' : ''}>${w === 'all' ? 'ทั้งเดือน' : 'สัปดาห์ ' + w}</button>`).join('');
  }

  function inWeek(ev, w) {
    if (w === 'all') return true;
    const day = +ymd(ev.date).slice(8, 10);
    if (w === '1') return day <= 7; if (w === '2') return day >= 8 && day <= 14;
    if (w === '3') return day >= 15 && day <= 21; return day >= 22;
  }

  function render() {
    const listEl = document.querySelector(render.sel), stateEl = document.querySelector(render.state);
    let rows = ALL.slice();
    if (state.type) rows = rows.filter((e) => (e.type || 'Road') === state.type);
    if (state.month !== 'all') rows = rows.filter((e) => monthKey(e) === state.month && inWeek(e, state.week));
    const today = bkkToday();
    const up = rows.filter((e) => ymd(e.date) >= today).sort((a, b) => ymd(a.date) < ymd(b.date) ? -1 : 1);
    const past = rows.filter((e) => ymd(e.date) < today).sort((a, b) => ymd(a.date) > ymd(b.date) ? -1 : 1);

    if (!rows.length) { listEl.innerHTML = ''; stateEl.style.display = ''; stateEl.textContent = 'ไม่มีงานในช่วงที่เลือก'; return; }
    stateEl.style.display = 'none';

    let html = '';
    if (state.month === 'all') {
      const byM = {};
      up.forEach((e) => { (byM[monthKey(e)] = byM[monthKey(e)] || []).push(e); });
      Object.keys(byM).sort().forEach((mk) => {
        const [y, mo] = mk.split('-');
        html += `<div class="cal-month-divider">${THAI_MONTHS_FULL[+mo - 1]} ${+y + 543}</div><div class="ev-grid">${byM[mk].map((e) => card(e, false)).join('')}</div>`;
      });
    } else {
      html += `<div class="ev-grid">${up.map((e) => card(e, false)).join('')}</div>`;
    }
    if (past.length) html += `<div class="cal-past-divider">— ผ่านไปแล้ว —</div><div class="ev-grid">${past.map((e) => card(e, true)).join('')}</div>`;
    listEl.innerHTML = html;
  }

  function wire() {
    document.getElementById('calMonths').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.month = b.dataset.month; state.week = 'all'; buildFilters(); render(); });
    document.getElementById('calWeeks').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.week = b.dataset.week; buildFilters(); render(); });
    document.getElementById('calTypes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.type = b.dataset.type; document.querySelectorAll('#calTypes button').forEach((x) => x.classList.toggle('active', x === b)); render(); });
  }

  window.renderCalendar = async function (listSel, stateSel) {
    render.sel = listSel; render.state = stateSel;
    const stateEl = document.querySelector(stateSel);
    try {
      const r = await fetch('/api/events');
      const j = await r.json();
      ALL = j.events || [];
    } catch (e) { stateEl.textContent = 'โหลดปฏิทินไม่สำเร็จ'; return; }
    if (!ALL.length) { stateEl.textContent = 'ยังไม่มีงานในปฏิทิน'; return; }
    buildFilters(); wire(); render();
  };
})();
