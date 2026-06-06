/* ================================================================
   audit-rank.js — Data-quality audit for Thailand Runner Rank
   ----------------------------------------------------------------
   Read-only. Scans the Checkrace results feed and reports the issues
   that pollute rankings, so they can be fixed in data/rank-events.json
   (natOverrides) or upstream:

     1. Nationality inconsistencies  — same runner keyed with >1 country
        (cross-event); suggests the majority and how many records flip.
     2. Suspected mis-keyed foreigners — runners keyed THA whose best time
        beats a plausible Thai-elite threshold (prime natOverride targets).
     3. chip/gun glitches            — |chip − gun| > 45 min (bad mat read
        or time-of-day gun).
     4. Non-finishers in the feed    — DSQ / DNF / DNS counts.

   Usage:
     node scripts/audit-rank.js                 # fetch live
     node scripts/audit-rank.js <results.json>  # audit a local dump
   ================================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RD_PATH = path.join(ROOT, 'assets', 'js', 'race-data.js');
const REG_PATH = path.join(ROOT, 'data', 'rank-events.json');

function loadRace() {
  const code = fs.readFileSync(RD_PATH, 'utf8');
  const ctx = { console }; ctx.window = ctx;
  vm.createContext(ctx); vm.runInContext(code, ctx, { filename: 'race-data.js' });
  return ctx.RACE;
}
function getJSON(url) {
  return new Promise((resolve, reject) => {
    const get = (u, n) => https.get(u, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (n > 5) return reject(new Error('redirects')); return get(res.headers.location, n + 1);
      }
      let b = ''; res.on('data', (d) => b += d); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
    get(url, 0);
  });
}

const normName = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const NAT_ALIAS = { TH: 'THA', PHL: 'PHI', GER: 'DEU', UAE: 'ARE', NED: 'NLD' };
const canonNat = (n) => { const u = String(n || '').toUpperCase(); return NAT_ALIAS[u] || u; };
const isThai = (n) => canonNat(n) === 'THA';
const fullName = (r) => ((r.first_name || '') + ' ' + (r.last_name || '')).replace(/\s+/g, ' ').trim();

// Plausible Thai-elite ceilings (seconds). Faster + keyed THA = suspect.
const THAI_ELITE = {
  '42.195': { M: 8280, F: 9600 },   // ~2:18 / 2:40
  '21.1':   { M: 3900, F: 4440 },   // ~1:05 / 1:14
  '10':     { M: 1800, F: 2040 },   // ~30:00 / 34:00
  '5':      { M: 870,  F: 990 }     // ~14:30 / 16:30
};

(async () => {
  const RACE = loadRace();
  let reg = {}; try { reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8')); } catch (e) {}
  const overrides = reg.natOverrides || {};

  const arg = process.argv[2];
  let rows;
  if (arg) { console.log('Audit ← local dump:', arg); rows = JSON.parse(fs.readFileSync(arg, 'utf8')); }
  else { console.log('Audit ← getAllResults (live)…'); rows = await getJSON(reg.checkraceApi + '?action=getAllResults'); }
  console.log('Rows:', rows.length, '\n');

  // ---- 1. Nationality inconsistencies (cross-event) ----
  const byName = {};
  rows.forEach((r) => {
    const k = normName(fullName(r)); if (!k) return;
    const c = canonNat(r.nationality || '?');
    (byName[k] = byName[k] || { nats: {}, n: 0, display: fullName(r) }).nats[c] = (byName[k].nats[c] || 0) + 1;
    byName[k].n++;
  });
  const inconsistent = Object.entries(byName)
    .filter(([, v]) => Object.keys(v.nats).filter((x) => x !== '?').length > 1)
    .map(([k, v]) => {
      const sorted = Object.entries(v.nats).filter(([c]) => c !== '?').sort((a, b) => b[1] - a[1]);
      const majority = sorted[0][0];
      const flips = sorted.slice(1).reduce((s, [, c]) => s + c, 0);
      return { name: v.display, nats: v.nats, majority, flips, thai: !!(v.nats.THA) };
    })
    .sort((a, b) => b.flips - a.flips);

  console.log('========================================================');
  console.log('1) NATIONALITY INCONSISTENCIES (same runner, >1 country)');
  console.log('========================================================');
  console.log('Total inconsistent runners:', inconsistent.length,
    '| involving THA:', inconsistent.filter((x) => x.thai).length);
  console.log('Cross-event majority vote would auto-correct all of these.\n');
  console.log('Top 30 by # records that would change:');
  inconsistent.slice(0, 30).forEach((x) => {
    console.log('  ' + x.name.padEnd(28) + ' ' + JSON.stringify(x.nats) + '  → ' + x.majority + ' (flip ' + x.flips + ')');
  });

  // ---- 2. Suspected mis-keyed foreigners on the Thai board ----
  // best time per (name) per distance, THA only, faster than Thai-elite ceiling
  // Resolve each runner's country the way build-rank does (override > majority)
  const natOf = {};
  for (const k in byName) {
    const s = Object.entries(byName[k].nats).filter(([c]) => c !== '?').sort((a, b) => b[1] - a[1]);
    if (s.length && (s.length === 1 || s[0][1] > s[1][1])) natOf[k] = s[0][0];
  }
  Object.keys(overrides).forEach((k) => { natOf[normName(k)] = canonNat(overrides[k]); });

  // Per distance, the Thai best-time board (deduped). Flag rows that are a
  // candidate for a hidden mis-key: a Latin-only name (no Thai script) with
  // very few records — i.e. a one-off appearance that could be a foreigner.
  const hasThai = (s) => /[฀-๿]/.test(s);
  const board = {}; // dist -> {name -> {sec,time,event}}
  rows.forEach((r) => {
    if (['DSQ', 'DQ', 'DNF', 'DNS'].includes(String(r.status || '').toUpperCase())) return;
    const k = normName(fullName(r));
    const nat = natOf[k] || canonNat(r.nationality);
    if (!isThai(nat)) return;
    const nd = RACE.normDist(parseFloat(r.distance) || 0);
    const key = String(nd); if (!THAI_ELITE[key]) return;
    r.distance = nd;
    const sec = RACE.bestTime(r); if (!(sec > 0) || sec >= 999000) return;
    (board[key] = board[key] || {});
    if (!board[key][k] || sec < board[key][k].sec) board[key][k] = { name: fullName(r), sec, time: RACE.secToTime(sec), event: r.event };
  });

  console.log('\n========================================================');
  console.log('2) MIS-KEY CANDIDATES — Latin name + few records in Thai top 40');
  console.log('========================================================');
  console.log('Already-fixed (vote/override) names are excluded. Eyeball these');
  console.log('for foreign elites still keyed THA; add real ones to natOverrides.\n');
  ['42.195', '21.1', '10', '5'].forEach((key) => {
    const list = Object.values(board[key] || {}).sort((a, b) => a.sec - b.sec).slice(0, 40);
    const flagged = list.map((e, i) => ({ ...e, rank: i + 1, recs: (byName[normName(e.name)] || { n: 0 }).n }))
      .filter((e) => !hasThai(e.name) && e.recs <= 2);
    if (!flagged.length) return;
    console.log('  [' + RACE.distLabel(parseFloat(key)) + ']');
    flagged.forEach((e) => console.log('    #' + String(e.rank).padEnd(3) + e.name.padEnd(28) + e.time + '  (' + e.event + ', recs=' + e.recs + ')'));
  });
  console.log('\n  Note: Thai names also appear here (one-time runners) — only override');
  console.log('  names you can confirm are foreign (e.g. Kenyan/Ethiopian elites).');

  // ---- 3. chip/gun glitches ----
  let glitch = 0;
  rows.forEach((r) => {
    const ct = RACE.timeToSec(r.chip_time), gt = RACE.timeToSec(r.gun_time);
    if (ct < 999999 && gt < 999999 && Math.abs(gt - ct) > RACE.MAX_CHIP_GUN_DIFF) glitch++;
  });
  console.log('\n========================================================');
  console.log('3) CHIP/GUN GLITCHES (|chip − gun| > 45 min)');
  console.log('========================================================');
  console.log('Records:', glitch, '— handled at rank time by RACE._resolve (chip vs gun).');

  // ---- 4. non-finishers ----
  const st = {};
  rows.forEach((r) => { const s = String(r.status || 'Finish').toUpperCase(); st[s] = (st[s] || 0) + 1; });
  console.log('\n========================================================');
  console.log('4) NON-FINISHERS IN FEED (excluded from rankings)');
  console.log('========================================================');
  console.log('Status counts:', JSON.stringify(st));
  console.log('\nDone.');
})().catch((e) => { console.error('audit failed:', e); process.exit(1); });
