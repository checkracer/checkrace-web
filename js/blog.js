/* ============================================
   CHECKRACE — Blog (list, article reader, star rating)
   Talks to the D1-backed Pages Functions under /api/blog
   ============================================ */

const CAT_LABELS = {
  training: 'ฝึกซ้อม', event: 'รีวิวงาน', nutrition: 'โภชนาการ',
  gear: 'อุปกรณ์', inspire: 'แรงบันดาลใจ', news: 'ข่าวสาร', review: 'รีวิว', community: 'คอมมูนิตี้',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(s) {
  if (!s) return '';
  try {
    return new Date(s.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'))
      .toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// Static star display (read-only). avg 0..5
function starsHTML(avg) {
  const full = Math.round(Number(avg) || 0);
  let out = '<span class="stars" aria-label="' + (avg || 0) + ' ดาว">';
  for (let i = 1; i <= 5; i++) {
    out += '<svg class="' + (i <= full ? '' : 'empty') + '" viewBox="0 0 24 24" fill="currentColor">'
      + '<path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z"/></svg>';
  }
  return out + '</span>';
}

async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

// ---- Blog list ----
async function renderBlogList(gridSel, stateSel) {
  const grid = document.querySelector(gridSel);
  const state = document.querySelector(stateSel);
  let data;
  try { data = await getJSON('/api/blog'); } catch { data = { posts: [] }; }
  const posts = data.posts || [];
  if (!posts.length) {
    if (state) state.textContent = 'ยังไม่มีบทความในขณะนี้';
    return;
  }
  if (state) state.style.display = 'none';
  grid.innerHTML = posts.map((p) => {
    const cat = CAT_LABELS[p.category] || p.category || '';
    const href = 'article.html?slug=' + encodeURIComponent(p.slug);
    const cover = p.cover_image
      ? '<a class="cover" href="' + href + '"><img src="' + esc(p.cover_image) + '" alt="' + esc(p.cover_alt || p.title) + '" loading="lazy"></a>'
      : '<a class="cover placeholder" href="' + href + '"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21"/></svg></a>';
    const rating = p.rating_count
      ? '<span class="sep">·</span>' + starsHTML(p.rating_avg) + ' <span>' + p.rating_avg + ' (' + p.rating_count + ')</span>'
      : '';
    return '<article class="blog-card">' + cover + '<div class="body">'
      + (cat ? '<span class="blog-cat">' + esc(cat) + '</span>' : '')
      + '<h3><a href="' + href + '">' + esc(p.title) + '</a></h3>'
      + '<p class="excerpt">' + esc(p.excerpt || '') + '</p>'
      + '<div class="blog-meta"><span>' + esc(p.author || 'Checkrace') + '</span>'
      + (p.published_at ? '<span class="sep">·</span><span>' + fmtDate(p.published_at) + '</span>' : '')
      + rating + '</div></div></article>';
  }).join('');
}

// ---- Article reader + rating ----
async function renderArticle() {
  const slug = new URLSearchParams(location.search).get('slug');
  const wrap = document.querySelector('#article');
  const state = document.querySelector('#articleState');
  if (!slug) { if (state) state.textContent = 'ไม่พบบทความ'; return; }

  let data;
  try { data = await getJSON('/api/blog/' + encodeURIComponent(slug)); } catch { data = {}; }
  if (!data || !data.post) { if (state) state.textContent = 'ไม่พบบทความนี้'; return; }
  const p = data.post;
  if (state) state.style.display = 'none';

  document.title = p.title + ' — Checkrace';
  const cat = CAT_LABELS[p.category] || p.category || '';
  wrap.innerHTML =
    (cat ? '<span class="blog-cat">' + esc(cat) + '</span>' : '')
    + '<h1 style="margin:12px 0">' + esc(p.title) + '</h1>'
    + '<div class="blog-meta" style="margin-bottom:24px"><span>' + esc(p.author || 'Checkrace') + '</span>'
    + (p.published_at ? '<span class="sep">·</span><span>' + fmtDate(p.published_at) + '</span>' : '')
    + '<span class="sep">·</span><span>' + (p.views || 0) + ' views</span></div>'
    + (p.cover_image ? '<img class="article-cover" src="' + esc(p.cover_image) + '" alt="' + esc(p.cover_alt || p.title) + '">' : '')
    + '<div class="article-body">' + (p.body || '') + '</div>'
    + '<div class="rate-box"><h3>ให้คะแนนบทความนี้</h3>'
    + '<div class="star-rate" id="starRate"></div>'
    + '<div class="rate-summary" id="rateSummary"></div></div>';

  initRating(slug, data.rating || { count: 0, avg: 0, mine: 0 });
}

function starSvg(on) {
  return '<svg class="' + (on ? 'on' : '') + '" viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z"/></svg>';
}

function initRating(slug, rating) {
  const box = document.querySelector('#starRate');
  const summary = document.querySelector('#rateSummary');
  let mine = rating.mine || 0;
  let busy = false;

  function paint(hover) {
    const active = hover || mine;
    box.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const span = document.createElement('span');
      span.innerHTML = starSvg(i <= active);
      span.dataset.v = i;
      box.appendChild(span);
    }
  }
  function summaryText() {
    const avg = rating.avg || 0;
    const count = rating.count || 0;
    summary.innerHTML = count
      ? 'คะแนนเฉลี่ย <strong>' + avg + '</strong> / 5 จาก ' + count + ' โหวต'
        + (mine ? ' · คุณให้ ' + mine + ' ดาว' : '')
      : (mine ? 'คุณให้ ' + mine + ' ดาว — ขอบคุณครับ' : 'ยังไม่มีคะแนน เป็นคนแรกเลย!');
  }

  box.addEventListener('mouseover', (e) => {
    const s = e.target.closest('[data-v]'); if (s) paint(parseInt(s.dataset.v, 10));
  });
  box.addEventListener('mouseleave', () => paint(0));
  box.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-v]'); if (!s || busy) return;
    busy = true;
    const v = parseInt(s.dataset.v, 10);
    try {
      const res = await getJSON('/api/blog/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, rating: v }),
      });
      if (res && res.rating) { rating = res.rating; mine = res.rating.mine; }
    } catch {}
    busy = false;
    paint(0); summaryText();
  });

  paint(0); summaryText();
}
