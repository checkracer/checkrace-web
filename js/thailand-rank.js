/* ============================================
   CHECKRACE — Thailand Runner Rank
   Loads data/rankings.json (precomputed by scripts/build-rank.js)
   and renders a national best-time leaderboard per distance.
   ============================================ */

const RANK = {
  data: null,
  dist: '42K',
  scope: 'tha',     // 'tha' | 'all'
  gender: 'all',    // 'all' | 'M' | 'F'
  source: 'all',    // 'all' | 'cr' (Checkrace) | 'ext' (external)
  view: 'overall',  // 'overall' | 'age'
  query: '',
  MAX_ROWS: 300,    // rows rendered into the DOM (overall view)
  AGE_SHOW: 10      // rows shown per age group (age view)
};

// IOC / ISO country code -> emoji flag (common running nationalities)
const IOC2ISO = {
  THA:'TH', KEN:'KE', ETH:'ET', JPN:'JP', USA:'US', GBR:'GB', FRA:'FR', GER:'DE',
  CHN:'CN', KOR:'KR', MAS:'MY', MYS:'MY', SGP:'SG', INA:'ID', VIE:'VN', PHI:'PH',
  LAO:'LA', MMR:'MM', CAM:'KH', IND:'IN', RUS:'RU', UKR:'UA', AUS:'AU', NZL:'NZ',
  ITA:'IT', ESP:'ES', NED:'NL', BEL:'BE', POL:'PL', HKG:'HK', TWN:'TW', UGA:'UG',
  RSA:'ZA', MAR:'MA', BRN:'BN', CAN:'CA', BRA:'BR'
};
function flagEmoji(nat) {
  const code = String(nat || '').toUpperCase();
  const iso = IOC2ISO[code] || (code.length === 2 ? code : '');
  if (iso.length !== 2) return '';
  return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65)
       + String.fromCodePoint(0x1F1E6 + iso.charCodeAt(1) - 65);
}

function tr(key, fallback) {
  return (window.i18n && window.i18n.t(key)) || fallback || key;
}

async function loadRankings() {
  const res = await fetch('data/rankings.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load rankings.json');
  return res.json();
}

// Build the ranked list for the current distance + scope + gender (sorted, with rank #)
function rankedList() {
  if (!RANK.data) return [];
  const bucket = RANK.data.byDistance[RANK.dist];
  if (!bucket) return [];
  // each scope has its own gender-split list so women aren't truncated by a
  // male-dominated overall list: tha / tha_M / tha_F / all / all_M / all_F
  const key = RANK.scope + (RANK.gender === 'all' ? '' : '_' + RANK.gender);
  let list = bucket[key] || bucket[RANK.scope] || [];
  // source filter: Checkrace-timed vs external (non-Checkrace) events
  if (RANK.source === 'cr' || RANK.source === 'ext') {
    list = list.filter(e => (e.src || 'cr') === RANK.source);
  }
  // arrays are pre-sorted by time → rank = position in this (filtered) view
  return list.map((e, i) => Object.assign({ rank: i + 1 }, e));
}

// Dispatch between the overall leaderboard and the age-group view
function render() {
  if (!RANK.data) return;
  const isAge = RANK.view === 'age';
  document.getElementById('overallView').style.display = isAge ? 'none' : '';
  document.getElementById('ageView').style.display = isAge ? '' : 'none';
  if (isAge) renderAge(); else renderOverall();
}

function renderOverall() {
  const body = document.getElementById('rankBody');
  const countEl = document.getElementById('rankCount');
  if (!RANK.data) return;

  const ranked = rankedList();
  const q = RANK.query.trim().toLowerCase();
  const shown = q ? ranked.filter(e => e.name.toLowerCase().includes(q)) : ranked;

  // count label
  countEl.innerHTML = '<b>' + ranked.length.toLocaleString() + '</b> ' + tr('rank_runners', 'runners')
    + (q ? ' · "' + RANK.query + '" → ' + shown.length.toLocaleString() : '');

  if (!shown.length) {
    body.innerHTML = '<tr><td colspan="4" class="rank-state">' + tr('rank_empty', 'No runners') + '</td></tr>';
    return;
  }

  const rows = shown.slice(0, RANK.MAX_ROWS).map(e => {
    const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : '';
    const rkCls = e.rank <= 3 ? ' rk-' + e.rank : '';
    const flag = flagEmoji(e.nat);
    const sex = (e.gender === 'M' || e.gender === 'F')
      ? '<span class="rn-sex ' + e.gender + '">' + e.gender + '</span>' : '';
    const evCls = e.src === 'ext' ? 'rn-ev ext' : 'rn-ev';
    const ev = e.event
      ? '<span class="' + evCls + '">' + e.event + '</span>' + (e.year ? '<span class="rn-yr">' + e.year + '</span>' : '')
      : '<span class="rn-yr">—</span>';
    return '<tr>'
      + '<td class="rk' + rkCls + '">' + (medal ? '<span class="rk-medal">' + medal + '</span> ' : '') + e.rank + '</td>'
      + '<td><span class="rn-name">' + (flag ? '<span class="rn-flag">' + flag + '</span>' : '') + escapeHtml(e.name) + sex + '</span></td>'
      + '<td class="rn-time">' + e.time + '</td>'
      + '<td class="col-ev">' + ev + '</td>'
      + '</tr>';
  }).join('');

  body.innerHTML = rows;
}

function bracketLabel(b) {
  if (b === 'U30') return tr('rank_age_u30', 'Under 30');
  return b.replace('-', '–') + ' ' + tr('rank_age_yr', 'yrs');
}

// Age-group view: one card per 10-year bracket, top-N within the current
// distance / scope / gender / source. Ranks recompute inside each group.
function renderAge() {
  const wrap = document.getElementById('ageView');
  if (!RANK.data) return;
  const brackets = RANK.data.ageBrackets || ['U30', '30-39', '40-49', '50-59', '60-69', '70+'];
  const bd = (RANK.data.byAge && RANK.data.byAge[RANK.dist]) || null;
  const scopeMap = bd ? (bd[RANK.scope] || bd.tha || {}) : {};
  const q = RANK.query.trim().toLowerCase();

  const cards = brackets.map(b => {
    let list = (scopeMap[b] || []).slice();
    if (RANK.gender === 'M' || RANK.gender === 'F') list = list.filter(e => e.gender === RANK.gender);
    if (RANK.source === 'cr' || RANK.source === 'ext') list = list.filter(e => (e.src || 'cr') === RANK.source);
    let ranked = list.map((e, i) => Object.assign({ rank: i + 1 }, e));   // rank within group
    const total = ranked.length;
    if (q) ranked = ranked.filter(e => e.name.toLowerCase().includes(q));

    let inner;
    if (!ranked.length) {
      inner = '<div class="age-empty">' + tr('rank_age_empty', 'No runners') + '</div>';
    } else {
      inner = '<table>' + ranked.slice(0, RANK.AGE_SHOW).map(e => {
        const m = e.rank <= 3 ? ' m' + e.rank : '';
        const flag = flagEmoji(e.nat);
        const ext = e.src === 'ext' ? '<span class="rn-ev ext" style="margin-left:6px">' + escapeHtml(e.event || '') + '</span>' : '';
        const sex = (e.gender === 'M' || e.gender === 'F') ? '<span class="rn-sex ' + e.gender + '">' + e.gender + '</span>' : '';
        return '<tr><td class="agr' + m + '">' + e.rank + '</td>'
          + '<td>' + (flag ? '<span class="rn-flag">' + flag + '</span>' : '') + escapeHtml(e.name) + sex + ext + '</td>'
          + '<td class="agt">' + e.time + '</td></tr>';
      }).join('') + '</table>';
    }
    return '<div class="age-group">'
      + '<div class="age-group-head"><h3>' + bracketLabel(b) + '</h3>'
      + '<span class="ag-n">' + total.toLocaleString() + ' ' + tr('rank_runners', 'runners') + '</span></div>'
      + inner + '</div>';
  }).join('');

  wrap.innerHTML = '<div class="age-grid">' + cards + '</div>'
    + '<div class="rank-note" style="margin-top:var(--space-lg)"><p>' + tr('rank_age_note', '') + '</p></div>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function initControls() {
  // view mode: overall ↔ by age group
  document.querySelectorAll('#viewSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#viewSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      RANK.view = btn.dataset.view;
      render();
    });
  });
  // distance tabs
  document.querySelectorAll('#distTabs .event-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#distTabs .event-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      RANK.dist = tab.dataset.dist;
      render();
    });
  });
  // scope segmented
  document.querySelectorAll('#scopeSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scopeSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      RANK.scope = btn.dataset.scope;
      render();
    });
  });
  // gender
  document.getElementById('genderSel').addEventListener('change', e => {
    RANK.gender = e.target.value;
    render();
  });
  // source (Checkrace / external)
  document.getElementById('sourceSel').addEventListener('change', e => {
    RANK.source = e.target.value;
    render();
  });
  // search (debounced)
  let to = null;
  document.getElementById('searchInp').addEventListener('input', e => {
    clearTimeout(to);
    const v = e.target.value;
    to = setTimeout(() => { RANK.query = v; render(); }, 180);
  });
  // re-render dynamic labels when language switches
  document.querySelectorAll('.lang-switcher button').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(render, 0));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initControls();
  try {
    RANK.data = await loadRankings();
    // default to the distance with the most data if 42K is thin
    render();
  } catch (err) {
    console.error('[Checkrace] rankings load error:', err);
    document.getElementById('rankBody').innerHTML =
      '<tr><td colspan="4" class="rank-state">โหลดข้อมูลอันดับไม่สำเร็จ — โปรดลองใหม่ภายหลัง</td></tr>';
  }
});
