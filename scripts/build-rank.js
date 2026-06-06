/* ================================================================
   build-rank.js — Build the Thailand Runner Rank leaderboard
   ----------------------------------------------------------------
   Merges every standard timed result we can reach into one national
   best-time leaderboard per distance (42K / 21K / 10K / 5K):

     1. Checkrace timing DB  — Apps Script getAllResults (the base)
     2. External events      — public RaceResult result pages listed
                               in data/rank-events.json (raceResultEvents)

   Ranking = each runner's single BEST validated time per distance
   (chip preferred, gun fallback, suspicious times rejected — same
   RACE.bestTime logic the public Results page uses). One row per
   runner per distance (dedup by name+gender, fastest kept).

   Output: data/rankings.json  (top lists per distance — loads instantly)

   Usage:
     node scripts/build-rank.js                 # fetch Checkrace live + registry
     node scripts/build-rank.js <checkrace.json> # use a local results dump as base
   ================================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RD_PATH = path.join(ROOT, 'assets', 'js', 'race-data.js');
const REG_PATH = path.join(ROOT, 'data', 'rank-events.json');
const OUT_PATH = path.join(ROOT, 'data', 'rankings.json');

const DEFAULT_TOP_N = 300;    // entries kept per distance per view (× 6 views)
const AGE_TOP_N = 100;        // entries kept per (distance, scope, age bracket)
const BUCKETS = { '42.195': '42K', '21.1': '21K', '10': '10K', '5': '5K' };
const DIST_ORDER = ['42K', '21K', '10K', '5K'];

// ---- Reuse EVENT_META + bestTime/normDist helpers from race-data.js ----
function loadRace() {
  const code = fs.readFileSync(RD_PATH, 'utf8');
  const ctx = { console };
  ctx.window = ctx;                 // window.RACE and bare RACE → same object
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'race-data.js' });
  return ctx.RACE;
}

function httpGet(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        return resolve(httpGet(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      let buf = '';
      res.on('data', (d) => buf += d);
      res.on('end', () => resolve(buf));
    }).on('error', reject);
  });
}
const getJSON = (url) => httpGet(url).then(JSON.parse);

// Merge IOC/ISO duplicates so nationality votes combine (canonical = IOC-ish)
const NAT_ALIAS = { TH: 'THA', PHL: 'PHI', MYS: 'MAS', KHM: 'CAM', ZAF: 'RSA', IDN: 'INA',
  IRN: 'IRI', CHE: 'SUI', DEU: 'GER', NLD: 'NED', VNM: 'VIE', SGP: 'SIN', KOR: 'KOR' };
const canonNat = (n) => { const u = String(n || '').toUpperCase(); return NAT_ALIAS[u] || u; };
const isThai = (nat) => canonNat(nat) === 'THA';
const fullNameOf = (r) => ((r.first_name || '') + ' ' + (r.last_name || '')).replace(/\s+/g, ' ').trim();

// Fix mis-keyed nationality. A runner is identified by name; their country is
// the majority vote across all their records (cross-event), unless overridden
// manually in rank-events.json "natOverrides" (for foreigners mis-keyed in
// EVERY record, which a vote can't catch). Returns # of records changed.
function reconcileNationality(rows, overrides) {
  overrides = overrides || {};
  const ovr = {};
  Object.keys(overrides).forEach((k) => { ovr[normName(k)] = canonNat(overrides[k]); });

  const tally = {};
  for (const r of rows) {
    const k = normName(fullNameOf(r)); if (!k) continue;
    const c = canonNat(r.nationality); if (!c || c === '?') continue;
    (tally[k] = tally[k] || {})[c] = (tally[k][c] || 0) + 1;
  }
  const majority = {};
  for (const k in tally) {
    const s = Object.entries(tally[k]).sort((a, b) => b[1] - a[1]);
    if (s.length === 1 || s[0][1] > s[1][1]) majority[k] = s[0][0];  // skip ties
  }
  let changed = 0;
  for (const r of rows) {
    const k = normName(fullNameOf(r));
    const target = ovr[k] || majority[k];
    if (target && canonNat(r.nationality) !== target) { r.nationality = target; changed++; }
    else if (target) r.nationality = target;  // normalise alias even if unchanged
  }
  return changed;
}

// Canonical 10-year age brackets. Source events label age groups
// inconsistently (and never give birth year), so map each label to a
// 10-year bracket by the lower bound of its numeric range. Labels with no
// age number ("Overall", "Male", "Elite", "") return '' → no bracket.
const AGE_BRACKETS = ['U30', '30-39', '40-49', '50-59', '60-69', '70+'];
function ageBracket(category) {
  const t = String(category || '');
  let lo = null;
  const range = t.match(/(\d{2})\s*[-–]\s*(\d{2})/);
  if (range) lo = parseInt(range[1], 10);
  else { const plus = t.match(/(\d{2})\s*\+/); if (plus) lo = parseInt(plus[1], 10); }
  if (lo == null) return '';
  if (lo < 30) return 'U30';
  if (lo < 40) return '30-39';
  if (lo < 50) return '40-49';
  if (lo < 60) return '50-59';
  if (lo < 70) return '60-69';
  return '70+';
}
const normName = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const titleCase = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

// Back-fill missing gender from the same runner's other records, so one
// person isn't split into a "no-gender" entry + an "M" entry. ONLY fills when
// that exact name has a single known gender — never merges different names
// (e.g. the twins Nattawut Innum / Nattawat Innum stay separate). Returns # filled.
function reconcileGender(rows) {
  const known = {};
  for (const r of rows) {
    const g = String(r.gender || '').toUpperCase().charAt(0);
    if (g === 'M' || g === 'F') (known[normName(fullNameOf(r))] = known[normName(fullNameOf(r))] || new Set()).add(g);
  }
  let filled = 0;
  for (const r of rows) {
    const g = String(r.gender || '').toUpperCase().charAt(0);
    if (g === 'M' || g === 'F') continue;
    const set = known[normName(fullNameOf(r))];
    if (set && set.size === 1) { r.gender = [...set][0]; filled++; }
  }
  return filled;
}

// ---- RaceResult public results → normalized rows (same schema as Checkrace) ----
// Handles the format variety across organizers/years:
//   • Contest-0 lists (fetch once) vs Contest-1 lists (loop contests)
//   • flat arrays vs nested distance → gender → rows
//   • gender from a column (SexMF) OR from the group key OR the age-group name
//   • nationality from IOCNAME or a flag image (flags/XX.gif | /graphics/flags/XX.svg)
//   • chip from NetTime/Finish.CHIP, gun from TimeOrStatus/Finish.GUN
// Extract a 2-letter country from a flag image ref in any common shape:
//   [img:flags/ET.gif] · [img:/graphics/flags/ET.svg] · .../png/th_black.png
function flagToCode(v) {
  const m = String(v || '').match(/\/([A-Za-z]{2})(?:[_-][a-z]+)?\.(?:gif|svg|png)/i);
  return m ? m[1].toUpperCase() : '';
}
// Non-finisher markers in a RaceResult status/rank cell — matched at the start
// with a word boundary so "DNF", "DQ-Wave", "DSQ" are caught but a name like
// "Dquan" is not. (Not "Incomplete" — that can be a real finisher who missed a
// split mat; their bogus 0:00:00 time is rejected by the time checks anyway.)
const NONFINISH_RE = /^(DNF|DSQ|DNS|DQ)([ \-_]|$)/i;
function distFromName(n) {
  const s = String(n).toLowerCase();
  if (/half|ฮาล์ฟ/.test(s)) return 21.1;                 // "Half Marathon" → 21.1 (check before marathon)
  if (/marathon|full|มาราธอน/.test(s)) return 42.195;    // "Marathon" carries no number
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
function genderFromText(s) {
  const t = String(s || '');
  if (/female|women|หญิง/i.test(t)) return 'F';
  if (/male|men|ชาย/i.test(t)) return 'M';
  return '';
}
// pick the best public "results" list from the event config; returns the list obj
function listScore(l) {
  const n = String(l.Name); let s = 0;
  if (/overall/i.test(n)) s += 4;
  if (/results/i.test(n)) s += 2; else if (/result/i.test(n)) s += 1;
  if (/award|top\s*\d|age\s*group|gender|ceremony|winner|\bTH\b|thai/i.test(n)) s -= 5;
  return s;
}
function pickList(cfg) {
  const lists = (cfg.TabConfig && cfg.TabConfig.Lists) || [];
  if (!lists.length) return { Name: '02-Results|Results', Contest: '' };
  return lists.slice().sort((a, b) => listScore(b) - listScore(a))[0];
}
// Build the set of (listname, contest) to fetch. Handles all the shapes seen:
//   • one all-distance list, Contest 0 → fetch once (distance from group keys)
//   • one list with Contest 1..N variants → fetch per contest
//   • SEPARATE per-distance lists (Results42K / Results21K / Results10K, all
//     Contest 0) → fetch EACH (distance from the list name)
function planLists(cfg, ev) {
  const lists = (cfg.TabConfig && cfg.TabConfig.Lists) || [];
  let cands;
  if (ev.listname) cands = lists.filter((l) => l.Name === ev.listname);
  else cands = lists.filter((l) => listScore(l) > 0);
  if (!cands.length) cands = [pickList(cfg)];

  const contests = cfg.contests || {};
  const seen = new Set();
  const plan = [];
  for (const l of cands) {
    if (seen.has(l.Name)) continue;
    seen.add(l.Name);
    const group = cands.filter((c) => c.Name === l.Name);
    const hasC0 = group.some((c) => String(c.Contest || '') === '0' || String(c.Contest || '') === '');
    if (hasC0) {
      plan.push({ name: l.Name, contest: null, distHint: distFromName(l.Name) });
    } else {
      for (const cid of Object.keys(contests)) plan.push({ name: l.Name, contest: cid, distHint: distFromName(contests[cid]) });
    }
  }
  return plan;
}
function keyHints(key, ctx) {
  const token = String(key).replace(/^#\d+_/, '');
  const out = { dist: ctx.dist, gender: ctx.gender };
  if (/half|ฮาล์ฟ/i.test(token)) out.dist = 21.1;
  else if (/marathon|full|มาราธอน/i.test(token)) out.dist = 42.195;
  else if (/\d/.test(token)) { const m = token.match(/(\d+(?:\.\d+)?)/); if (m) out.dist = parseFloat(m[1]); }
  const g = genderFromText(token); if (g) out.gender = g;
  return out;
}
async function fetchRaceResult(ev, base, defaultList) {
  const id = ev.raceResultId;
  const cfg = await getJSON(`${base}/${id}/results/config?lang=en`);
  const key = cfg.key;
  const plan = planLists(cfg, ev);
  const payloads = [];
  for (const it of plan) {
    const u = `${base}/${id}/results/list?lang=en&key=${encodeURIComponent(key)}`
      + `&listname=${encodeURIComponent(it.name)}` + (it.contest ? `&contest=${encodeURIComponent(it.contest)}` : '');
    try { const p = await getJSON(u); if (p && p.data && Array.isArray(p.DataFields)) payloads.push({ p, distHint: it.distHint }); }
    catch (e) {}
  }

  const rows = [];
  for (const { p, distHint } of payloads) {
    const F = (p && p.DataFields) || [];
    if (!F.length || !p.data) continue;
    // Match a PRECISE token anywhere in the field name — works even when the
    // column is a wrapper formula like "if([RANK1]>0;[Finish.CHIP];'-')" or
    // "OrStatus([TIME2])". Tokens are specific (Finish.CHIP, GunTimeWave, …) so
    // they never catch a stray word inside the rank formula ("GunStart").
    const idxLike = (...subs) => {
      for (const s of subs) { const i = F.findIndex((f) => String(f).toUpperCase().includes(s.toUpperCase())); if (i >= 0) return i; }
      return -1;
    };
    // The single variable a simple field/wrapper exposes — "OrStatus([TIME2])"
    // → "TIME2", bare "TIME2" → "TIME2"; a multi-variable formula → ''. Used to
    // exact-match the generic TIME1/TIME2 columns (primeworks/timit) safely.
    const effVar = (f) => {
      const s = String(f || ''); const vars = s.match(/\[([^\]]+)\]/g);
      if (!vars) return s;
      const u = [...new Set(vars.map((v) => v.replace(/[[\]]/g, '').replace(/\.[A-Za-z]+$/, '')))];
      return u.length === 1 ? u[0] : '';
    };
    const idxExact = (...names) => {
      for (const n of names) { const i = F.findIndex((f) => effVar(f).toUpperCase() === n.toUpperCase()); if (i >= 0) return i; }
      return -1;
    };
    const iName = idxLike('DisplayName', 'Lastname', 'Name');
    const iIoc = idxLike('IOCNAME', 'NATION.NAME');
    const iFlag = idxLike('NATION.FLAG', 'CustomFlag');
    // named chip/gun columns first; fall back to the generic TIME2 (net) / TIME1
    // (gun) columns only when no named time field exists.
    let iChip = idxLike('Finish.CHIP', 'NetTime', 'ChipTime'); if (iChip < 0) iChip = idxExact('TIME2', 'TIME');
    let iGun = idxLike('Finish.GUN', 'GunTimeWave', 'GunTime', 'TimeOrStatus'); if (iGun < 0) iGun = idxExact('TIME1');
    const iSex = idxLike('SexMF', 'MaleFemale');
    const iAge = idxLike('AGEGROUP', 'AgeGroup', 'Category');
    const emit = (arr, ctx) => {
      for (const row of arr) {
        if (!Array.isArray(row)) continue;
        // skip non-finishers — DNF/DSQ/DQ-Wave can carry a partial time
        let nonfinish = false;
        for (const cell of row) { if (NONFINISH_RE.test(String(cell).trim())) { nonfinish = true; break; } }
        if (nonfinish) continue;
        const chip = iChip >= 0 ? row[iChip] : '';
        let nat = iIoc >= 0 ? row[iIoc] : '';
        if (!nat && iFlag >= 0) nat = flagToCode(row[iFlag]);
        let gender = ctx.gender || '';
        if (!gender && iSex >= 0) gender = String(row[iSex] || '').toUpperCase().charAt(0);
        if (!gender && iAge >= 0) gender = genderFromText(row[iAge]);
        rows.push({
          first_name: iName >= 0 ? row[iName] : '',
          last_name: '',
          gender: (gender === 'M' || gender === 'F') ? gender : '',
          nationality: String(nat || '').toUpperCase(),
          distance: ctx.dist || 0,
          chip_time: chip,
          gun_time: iGun >= 0 ? row[iGun] : chip,
          category: iAge >= 0 ? row[iAge] : '',
          event: ev.code || ('RR' + id),
          _year: ev.year,
          _source: 'raceresult:' + id
        });
      }
    };
    const walk = (node, ctx) => {
      if (Array.isArray(node)) { emit(node, ctx); return; }
      if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, keyHints(k, ctx)); }
    };
    walk(p.data, { dist: distHint || 0, gender: '' });
  }
  return rows;
}

// Per-event data-quality check — surfaces format/parsing problems the moment
// a new external event is added (nationality field not recognised, distance
// not mapped, times faster than a world record = mislabelled distance, etc.).
const WR_FLOOR = { '42.195': 7000, '21.1': 3300, '10': 1500, '5': 720 }; // below any real WR
function eventHealth(rows, RACE) {
  const buckets = {}; const fastest = {};
  let withNat = 0, unmapped = 0;
  for (const r of rows) {
    if (r.nationality) withNat++;
    const nd = RACE.normDist(parseFloat(r.distance) || 0);
    const label = BUCKETS[String(nd)];
    if (!label) { unmapped++; continue; }
    buckets[label] = (buckets[label] || 0) + 1;
    r.distance = nd;
    const sec = RACE.bestTime(r);
    if (sec > 0 && sec < 999000 && (!fastest[label] || sec < fastest[label])) fastest[label] = sec;
  }
  const n = rows.length;
  const natPct = n ? Math.round((100 * withNat) / n) : 0;
  const warnings = [];
  if (!n) warnings.push('0 finishers parsed — list/format problem');
  if (n && natPct === 0) warnings.push('no nationality parsed (flag/IOC field not recognised)');
  if (natPct > 0 && natPct < 60) warnings.push('low nationality coverage (' + natPct + '%)');
  if (unmapped > Math.max(20, n * 0.1)) warnings.push(unmapped + ' rows with unmapped distance (contest name?)');
  for (const nd in WR_FLOOR) {
    const label = BUCKETS[nd];
    if (fastest[label] != null && fastest[label] < WR_FLOOR[nd]) {
      warnings.push('impossibly fast ' + label + ' ' + RACE.secToTime(fastest[label]) + ' — distance mislabel / bad parse');
    }
  }
  const distStr = Object.keys(buckets).map((l) => l + ':' + buckets[l]).join(' ') || '—';
  const fastStr = Object.keys(fastest).map((l) => l + ' ' + RACE.secToTime(fastest[l])).join(', ') || '—';
  return { line: n + ' finishers | dist ' + distStr + ' | nat ' + natPct + '% | fastest ' + fastStr, warnings };
}

// ---- Aggregate rows → best-time leaderboard per distance ----
function buildLeaderboard(rows, RACE, META, topN) {
  const TOP_N = topN || DEFAULT_TOP_N;
  // perDist[label] = Map(runnerKey -> bestEntry)
  const perDist = {};
  DIST_ORDER.forEach((d) => perDist[d] = new Map());

  for (const r of rows) {
    // skip non-finishers — DSQ (disqualified) / DNF / DNS must never rank
    const st = String(r.status || 'Finish').toUpperCase();
    if (st === 'DSQ' || st === 'DQ' || st === 'DNF' || st === 'DNS') continue;

    const nd = RACE.normDist(parseFloat(r.distance) || 0);
    const label = BUCKETS[String(nd)];
    if (!label) continue;
    r.distance = nd;                       // so MIN_RACE_TIME[dist] checks fire
    const sec = RACE.bestTime(r);
    if (!(sec > 0) || sec >= 999000) continue;   // invalid / suspicious time

    const full = titleCase(((r.first_name || '') + ' ' + (r.last_name || '')).trim());
    if (!full) continue;
    const gender = (r.gender === 'M' || r.gender === 'F') ? r.gender : '';
    const nat = String(r.nationality || '').toUpperCase();
    const key = normName(full) + '|' + gender;

    const map = perDist[label];
    const prev = map.get(key);
    if (!prev || sec < prev.sec) {
      const meta = META[r.event];
      map.set(key, {
        name: full,
        gender: gender,
        nat: nat || (isThai(nat) ? 'THA' : nat),
        sec: Math.round(sec),
        time: RACE.secToTime(sec),
        event: r.event || '',
        year: (meta && meta.year) || r._year || null,
        src: r._source ? 'ext' : 'cr',  // cr = Checkrace timing, ext = external (RaceResult etc.)
        ag: ageBracket(r.category)       // canonical 10-year bracket ('' if unknown)
      });
    }
  }

  const byDistance = {};
  const byAge = {};
  const summary = {};
  const top = (arr) => arr.slice(0, TOP_N);
  const topAge = (arr) => arr.slice(0, AGE_TOP_N);
  for (const d of DIST_ORDER) {
    const all = [...perDist[d].values()].sort((a, b) => a.sec - b.sec); // full, sorted
    const tha = all.filter((e) => isThai(e.nat));
    // 6 separate top-N lists so gender filters keep full depth (women are not
    // truncated by a male-dominated overall list). client picks scope[_gender].
    byDistance[d] = {
      all:   top(all),
      all_M: top(all.filter((e) => e.gender === 'M')),
      all_F: top(all.filter((e) => e.gender === 'F')),
      tha:   top(tha),
      tha_M: top(tha.filter((e) => e.gender === 'M')),
      tha_F: top(tha.filter((e) => e.gender === 'F'))
    };
    // Age-group view: top list per (scope, bracket); gender filtered client-side.
    const byBracket = (list) => {
      const o = {};
      for (const b of AGE_BRACKETS) o[b] = topAge(list.filter((e) => e.ag === b));
      return o;
    };
    byAge[d] = { all: byBracket(all), tha: byBracket(tha) };
    summary[d] = {
      runners: all.length, thai: tha.length,
      male: all.filter((e) => e.gender === 'M').length,
      female: all.filter((e) => e.gender === 'F').length,
      external: all.filter((e) => e.src === 'ext').length
    };
  }
  return { byDistance, byAge, summary };
}

(async () => {
  const RACE = loadRace();
  const META = RACE.EVENT_META || {};
  const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));

  // 1) Base: Checkrace timing DB
  let baseRows;
  const localArg = process.argv[2];
  if (localArg) {
    console.log('Base ← local dump:', localArg);
    baseRows = JSON.parse(fs.readFileSync(localArg, 'utf8'));
  } else {
    console.log('Base ← Checkrace getAllResults (live)…');
    baseRows = await getJSON(reg.checkraceApi + '?action=getAllResults');
  }
  if (!Array.isArray(baseRows)) throw new Error('Checkrace payload is not an array');
  console.log('  Checkrace rows:', baseRows.length);

  // Hide specific Checkrace event codes if curated out in the admin page
  const exclude = new Set((reg.checkraceExclude || []).map((c) => String(c).toUpperCase()));
  if (exclude.size) {
    const before = baseRows.length;
    baseRows = baseRows.filter((r) => !exclude.has(String(r.event || '').toUpperCase()));
    console.log(`  excluded ${exclude.size} Checkrace event(s) → dropped ${before - baseRows.length} rows`);
  }

  // 2) External events from the registry (timing-system aware)
  const ext = (reg.externalEvents || reg.raceResultEvents || []).filter((e) => e && e.included !== false);
  let extRows = [];
  const extEvents = [];
  for (const ev of ext) {
    const timing = (ev.timing || (ev.raceResultId ? 'raceresult' : '')).toLowerCase();
    const label = ev.code || ev.raceResultId || ev.name || '?';
    if (timing === 'raceresult' && ev.raceResultId) {
      try {
        const rows = await fetchRaceResult(ev, reg.raceResultBase, reg.raceResultList);
        const h = eventHealth(rows, RACE);
        console.log(`  + RaceResult ${label}: ${h.line}`);
        h.warnings.forEach((w) => console.log(`      ⚠️  ${label}: ${w}`));
        extRows = extRows.concat(rows);
        extEvents.push({ code: ev.code, name: ev.name, timing, raceResultId: ev.raceResultId, rows: rows.length, warnings: h.warnings });
      } catch (e) {
        console.warn(`  ! RaceResult ${label} failed: ${e.message}`);
      }
    } else {
      // mylaps / sportstats / other — no fetcher yet; record but skip
      console.warn(`  ~ ${label}: timing "${timing || 'unknown'}" not yet supported by build-rank — skipped`);
      extEvents.push({ code: ev.code, name: ev.name, timing: timing || 'unknown', skipped: true });
    }
  }

  // Fix mis-keyed nationality (cross-event majority + manual overrides)
  const allRows = baseRows.concat(extRows);
  const natChanged = reconcileNationality(allRows, reg.natOverrides);
  console.log('  nationality reconciled:', natChanged, 'record(s) recoded');
  // Back-fill missing gender so one person isn't split across entries
  const genFilled = reconcileGender(allRows);
  console.log('  gender back-filled:', genFilled, 'record(s)');

  const topN = (reg.criteria && reg.criteria.topN) || DEFAULT_TOP_N;
  const { byDistance, byAge, summary } = buildLeaderboard(allRows, RACE, META, topN);

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    distances: DIST_ORDER,
    topN: topN,
    ageBrackets: AGE_BRACKETS,
    sources: {
      checkrace: baseRows.length,
      externalEvents: extEvents
    },
    summary,
    byDistance,
    byAge
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log('Wrote', OUT_PATH);
  console.log('Summary:', JSON.stringify(summary, null, 1));
  for (const d of DIST_ORDER) {
    const t = byDistance[d].tha[0];
    if (t) console.log(`  ${d} fastest Thai: ${t.name} ${t.time} (${t.event} ${t.year || ''})`);
  }

  // Consolidated data-quality flags — easy to spot when adding new events
  const flagged = extEvents.filter((e) => (e.warnings && e.warnings.length) || e.skipped);
  console.log('\n===== DATA QUALITY =====');
  if (!flagged.length) {
    console.log('✓ no anomalies — all external events parsed cleanly');
  } else {
    console.log(flagged.length + ' external event(s) need a look:');
    flagged.forEach((e) => {
      const id = e.code || e.raceResultId;
      if (e.skipped) console.log(`  ~ ${id}: timing "${e.timing}" not supported yet`);
      else e.warnings.forEach((w) => console.log(`  ⚠️  ${id}: ${w}`));
    });
    console.log('Review with: node scripts/audit-rank.js  (and check the per-event lines above)');
  }
})().catch((e) => { console.error('build-rank failed:', e); process.exit(1); });
