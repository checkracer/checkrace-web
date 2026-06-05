/* ================================================================
   build-stats.js — Precompute Dashboard aggregates from live results
   ----------------------------------------------------------------
   Pulls all race results from the Checkrace Apps Script API, then
   reuses EVENT_META / helpers from assets/js/race-data.js so the
   year & series of every event match the public Results page exactly.

   Output: data/stats.json  (small, loaded instantly by the Dashboard)

   Usage:
     node scripts/build-stats.js            # fetch live, then build
     node scripts/build-stats.js <file>     # build from a local JSON dump
   ================================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RD_PATH = path.join(ROOT, 'assets', 'js', 'race-data.js');
const OUT_PATH = path.join(ROOT, 'data', 'stats.json');

// ---- Load EVENT_META + helpers from race-data.js (single source of truth) ----
function loadRace() {
  const code = fs.readFileSync(RD_PATH, 'utf8');
  // race-data.js does `window.RACE = window.RACE || {}` then uses bare `RACE`
  // (relies on the browser global). Make `window` the context global so
  // `window.RACE` and bare `RACE` resolve to the same object.
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'race-data.js' });
  return context.RACE;
}

function fetchLive(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirects) => {
      https.get(u, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (redirects > 5) return reject(new Error('Too many redirects'));
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        let buf = '';
        res.on('data', (d) => buf += d);
        res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
      }).on('error', reject);
    };
    get(url, 0);
  });
}

function aggregate(rows, RACE) {
  const META = RACE.EVENT_META || {};
  const byYear = {};         // year -> finishers
  const eventsByYear = {};   // year -> Set(eventCode)
  const seriesCount = {};    // series -> finishers
  const allEvents = new Set();
  let total = 0, male = 0, female = 0;
  const nats = new Set();

  rows.forEach((r) => {
    total++;
    const g = (r.gender || '').toString().toUpperCase().charAt(0);
    if (g === 'M') male++; else if (g === 'F') female++;
    if (r.nationality) nats.add(String(r.nationality).toUpperCase());

    const ev = r.event;
    if (ev) allEvents.add(ev);
    const meta = META[ev];
    const year = meta ? meta.year : null;
    if (year) {
      byYear[year] = (byYear[year] || 0) + 1;
      (eventsByYear[year] = eventsByYear[year] || new Set()).add(ev);
    }
    const series = RACE.getSeries ? RACE.getSeries(ev) : 'Other';
    seriesCount[series] = (seriesCount[series] || 0) + 1;
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  return {
    generated: new Date().toISOString().slice(0, 10),
    source: 'getAllResults (Apps Script) — aggregated by scripts/build-stats.js',
    totals: {
      finishers: total,
      male, female,
      events: allEvents.size,
      nationalities: nats.size,
      firstYear: years[0] || null,
      lastYear: years[years.length - 1] || null
    },
    years,
    finishersByYear: years.map((y) => byYear[y]),
    eventsByYear: years.map((y) => eventsByYear[y].size),
    seriesCount
  };
}

(async () => {
  const RACE = loadRace();
  const localArg = process.argv[2];
  let rows;
  if (localArg) {
    console.log('Reading local dump:', localArg);
    rows = JSON.parse(fs.readFileSync(localArg, 'utf8'));
  } else {
    console.log('Fetching live results from Apps Script…');
    rows = await fetchLive(RACE.API_URL + '?action=getAllResults');
  }
  if (!Array.isArray(rows)) throw new Error('Results payload is not an array');
  console.log('Rows:', rows.length);

  const stats = aggregate(rows, RACE);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(stats, null, 2));
  console.log('Wrote', OUT_PATH);
  console.log(JSON.stringify(stats, null, 2));
})().catch((e) => { console.error('build-stats failed:', e); process.exit(1); });
