/* ============================================
   CHECKRACE Dashboard — Charts & Event Timeline
   ============================================ */

// ===== Event Data (2026 — loaded from data/events-2026.json) =====
let events2026 = [];

async function loadEvents() {
  try {
    const res = await fetch('data/events-2026.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load events JSON');
    const data = await res.json();
    events2026 = data.events || [];
    return data;
  } catch (err) {
    console.error('[Checkrace] loadEvents error:', err);
    events2026 = [];
    return null;
  }
}

// ===== Real Stats (precomputed from live timing results) =====
// data/stats.json is built by scripts/build-stats.js from the Apps Script
// getAllResults feed (34MB) — aggregated so the Dashboard loads instantly.
let raceStats = null;

async function loadStats() {
  try {
    const res = await fetch('data/stats.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load stats JSON');
    raceStats = await res.json();
    return raceStats;
  } catch (err) {
    console.warn('[Checkrace] loadStats — using static fallback:', err.message);
    raceStats = null;
    return null;
  }
}

// Push real totals into the KPI cards (events held + total finishers),
// then re-run the counter animation so the live numbers tick up.
function applyStatsKpis() {
  if (!raceStats || !raceStats.totals) return;
  const t = raceStats.totals;
  const setByLabel = (i18nKey, val) => {
    if (!Number.isFinite(val)) return;
    const label = document.querySelector('.kpi-label[data-i18n="' + i18nKey + '"]');
    const card = label && label.closest('.kpi-card');
    const el = card && card.querySelector('.kpi-number');
    if (!el) return;
    el.setAttribute('data-target', val);
    if (typeof animateKpi === 'function') animateKpi(el);
    else el.textContent = val.toLocaleString() + (el.getAttribute('data-suffix') || '');
  };
  // 3rd KPI = events held all-time, 4th KPI = total finishers
  setByLabel('kpi_total_events', t.events);
  setByLabel('kpi_medals', t.finishers);
}

// ===== Render Event Cards =====
function renderEvents(filter = 'all') {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const list = filter === 'all' ? events2026 : events2026.filter(e => e.q === filter);
  grid.innerHTML = list.map(e => `
    <div class="event-card">
      <span class="event-card-month">${e.month}</span>
      <div class="event-card-code">${e.code}</div>
      <div class="event-card-name">${e.name}</div>
      <div class="event-card-meta">
        <span>📍 ${e.province}</span>
        <span>👥 ${e.target.toLocaleString()}</span>
      </div>
    </div>
  `).join('');

  // Update tab counts dynamically
  const all = events2026.length;
  const q1 = events2026.filter(e => e.q === 'q1').length;
  const q2 = events2026.filter(e => e.q === 'q2').length;
  const q3 = events2026.filter(e => e.q === 'q3').length;
  const q4 = events2026.filter(e => e.q === 'q4').length;
  const tabAll = document.querySelector('.event-tab[data-quarter="all"]');
  if (tabAll && !tabAll.dataset.countSet) {
    // Append count into text only if i18n hasn't run yet — main i18n key handles localization
    tabAll.dataset.countSet = '1';
  }
}

// ===== Tab Handler =====
function initEventTabs() {
  const tabs = document.querySelectorAll('.event-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderEvents(tab.dataset.quarter);
    });
  });
}

// ===== Chart.js — Common Config =====
const chartFont = "'Prompt', 'Noto Sans JP', sans-serif";
const colorRed = '#E53935';
const colorRedDark = '#C62828';
const colorGray = '#BDBDBD';

Chart.defaults.font.family = chartFont;
Chart.defaults.color = '#757575';

// ===== Runners Cumulative Chart =====
function initRunnersChart() {
  const ctx = document.getElementById('runnersChart');
  if (!ctx) return;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(229,57,53,0.35)');
  gradient.addColorStop(1, 'rgba(229,57,53,0.02)');

  // Real finishers-per-year from data/stats.json, else static fallback.
  const labels = (raceStats && raceStats.years)
    ? raceStats.years.map(String)
    : ['2020', '2021', '2022', '2023', '2024', '2025', '2026 (Target)'];
  const data = (raceStats && raceStats.finishersByYear)
    ? raceStats.finishersByYear
    : [25000, 18000, 35000, 55000, 72000, 80000, 100000];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'นักวิ่ง',
        data: data,
        borderColor: colorRed,
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'white',
        pointBorderColor: colorRed,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: '700' },
          callbacks: { label: (c) => '  ' + c.parsed.y.toLocaleString() + ' คน' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: (v) => (v / 1000) + 'K' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===== Events Per Year Chart =====
function initEventsChart() {
  const ctx = document.getElementById('eventsChart');
  if (!ctx) return;

  // Real events-per-year from data/stats.json, else static fallback.
  const labels = (raceStats && raceStats.years)
    ? raceStats.years.map(String)
    : ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
  const data = (raceStats && raceStats.eventsByYear)
    ? raceStats.eventsByYear
    : [8, 6, 12, 16, 18, 20, 26];
  // Ramp opacity from light → solid red across however many years we have.
  const n = data.length;
  const bg = data.map((_, i) => {
    if (i === n - 1) return colorRed;
    const a = 0.45 + (0.45 * i) / Math.max(1, n - 1);
    return 'rgba(229,57,53,' + a.toFixed(2) + ')';
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'งาน',
        data: data,
        backgroundColor: bg,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          padding: 12,
          cornerRadius: 8,
          callbacks: { label: (c) => '  ' + c.parsed.y + ' งาน' }
        }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===== Service Doughnut Chart =====
function initServiceChart() {
  const ctx = document.getElementById('serviceChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ระบบรับสมัคร', 'จับเวลา', 'เหรียญ/เสื้อ', 'Foto', 'Virtual Run'],
      datasets: [{
        data: [95, 88, 72, 45, 38],
        backgroundColor: ['#E53935', '#C62828', '#FF5252', '#FF8A80', '#FFAB91'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { size: 12 }, boxWidth: 12, boxHeight: 12, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          padding: 12,
          cornerRadius: 8,
          callbacks: { label: (c) => '  ' + c.label + ': ' + c.parsed + '%' }
        }
      }
    }
  });
}

// ===== KPI Counter Animation =====
function initKpiCounters() {
  const counters = document.querySelectorAll('.kpi-number');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateKpi(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateKpi(el) {
  const target = parseInt(el.getAttribute('data-target'), 10);
  const suffix = el.getAttribute('data-suffix') || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(eased * target);
    el.textContent = val.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString() + suffix;
  }
  requestAnimationFrame(tick);
}

// ===== Init on DOM Ready =====
document.addEventListener('DOMContentLoaded', async () => {
  // Load 2026 schedule + real aggregate stats in parallel
  await Promise.all([loadEvents(), loadStats()]);

  renderEvents('all');
  initEventTabs();

  // Override KPI counters with real totals (events held + finishers)
  applyStatsKpis();

  // Charts wait for Chart.js — now fed by raceStats when available
  if (typeof Chart !== 'undefined') {
    initRunnersChart();
    initEventsChart();
    initServiceChart();
  }
});
