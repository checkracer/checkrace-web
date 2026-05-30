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

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026 (Target)'],
      datasets: [{
        label: 'นักวิ่ง',
        data: [25000, 18000, 35000, 55000, 72000, 80000, 100000],
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

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
      datasets: [{
        label: 'งาน',
        data: [8, 6, 12, 16, 18, 20, 26],
        backgroundColor: [
          'rgba(229,57,53,0.5)',
          'rgba(229,57,53,0.55)',
          'rgba(229,57,53,0.6)',
          'rgba(229,57,53,0.7)',
          'rgba(229,57,53,0.8)',
          'rgba(229,57,53,0.9)',
          colorRed
        ],
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
  // Load real event data first (from data/events-2026.json)
  await loadEvents();

  renderEvents('all');
  initEventTabs();
  initKpiCounters();

  // Charts wait for Chart.js
  if (typeof Chart !== 'undefined') {
    initRunnersChart();
    initEventsChart();
    initServiceChart();
  }
});
