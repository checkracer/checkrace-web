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

const THAI = new Set(['THA', 'TH']);
const isThai = (nat) => THAI.has(String(nat || '').toUpperCase());
const normName = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const titleCase = (s) => String(s || '').trim().replace(/\s+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

// ---- RaceResult public results → normalized rows (same schema as Checkrace) ----
// Handles the format variety across organizers/years:
//   • Contest-0 lists (fetch once) vs Contest-1 lists (loop contests)
//   • flat arrays vs nested distance → gender → rows
//   • gender from a column (SexMF) OR from the group key OR the age-group name
//   • nationality from IOCNAME or a flag image (flags/XX.gif | /graphics/flags/XX.svg)
//   • chip from NetTime/Finish.CHIP, gun from TimeOrStatus/Finish.GUN
function flagToCode(v) {
  const m = String(v || '').match(/flags\/([A-Za-z]{2})\.(?:gif|svg|png)/i);
  return m ? m[1].toUpperCase() : '';
}
function distFromName(n) {
  const m = String(n).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
function genderFromText(s) {
  const t = String(s || '');
  if (/female|women|หญิง/i.test(t)) return 'F';
  if (/male|men|ชาย/i.test(t)) return 'M';
  return '';
}
// pick the best public "results" list from the event config; returns the list obj
function pickList(cfg) {
  const lists = (cfg.TabConfig && cfg.TabConfig.Lists) || [];
  if (!lists.length) return { Name: '02-Results|Results', Contest: '' };
  const score = (l) => {
    const n = String(l.Name); let s = 0;
    if (/overall/i.test(n)) s += 4;
    if (/results/i.test(n)) s += 2; else if (/result/i.test(n)) s += 1;
    if (/award|top\s*\d|age\s*group|gender|ceremony|\bTH\b/i.test(n)) s -= 5;
    return s;
  };
  return lists.slice().sort((a, b) => score(b) - score(a))[0];
}
function keyHints(key, ctx) {
  const token = String(key).replace(/^#\d+_/, '');
  const out = { dist: ctx.dist, gender: ctx.gender };
  if (/\d/.test(token)) { const m = token.match(/(\d+(?:\.\d+)?)/); if (m) out.dist = parseFloat(m[1]); }
  const g = genderFromText(token); if (g) out.gender = g;
  return out;
}
async function fetchRaceResult(ev, base, defaultList) {
  const id = ev.raceResultId;
  const cfg = await getJSON(`${base}/${id}/results/config?lang=en`);
  const key = cfg.key;
  const lists = (cfg.TabConfig && cfg.TabConfig.Lists) || [];
  let chosen = ev.listname ? (lists.find((l) => l.Name === ev.listname) || { Name: ev.listname, Contest: '' }) : pickList(cfg);
  const list = chosen.Name || defaultList || '02-Results|Results';
  const contestSetting = String(chosen.Contest == null ? '' : chosen.Contest);
  const url = (extra) => `${base}/${id}/results/list?lang=en&key=${encodeURIComponent(key)}`
    + `&listname=${encodeURIComponent(list)}` + (extra || '');

  // Contest-0 lists return everything in one call; otherwise loop the contests.
  const payloads = [];
  if (contestSetting === '0' || contestSetting === '') {
    try { payloads.push({ p: await getJSON(url()), distHint: 0 }); } catch (e) {}
  }
  if (!payloads.length) {
    const contests = cfg.contests || {};
    for (const cid of Object.keys(contests)) {
      try { payloads.push({ p: await getJSON(url(`&contest=${encodeURIComponent(cid)}`)), distHint: distFromName(contests[cid]) }); }
      catch (e) {}
    }
  }

  const rows = [];
  for (const { p, distHint } of payloads) {
    const F = (p && p.DataFields) || [];
    if (!F.length || !p.data) continue;
    const idxLike = (...subs) => {
      for (const s of subs) { const i = F.findIndex((f) => String(f).toUpperCase().includes(s.toUpperCase())); if (i >= 0) return i; }
      return -1;
    };
    const iName = idxLike('DisplayName', 'Name', 'Lastname');
    const iIoc = idxLike('IOCNAME', 'NATION.NAME');
    const iFlag = idxLike('NATION.FLAG', 'NATION');
    const iChip = idxLike('NetTime', 'Finish.CHIP', 'CHIP', 'ChipTime');
    const iGun = idxLike('TimeOrStatus', 'Finish.GUN', 'GUN', 'TotalTime', 'GunTime');
    const iSex = idxLike('SexMF', 'MaleFemale', 'Sex', 'Gender');
    const iAge = idxLike('AGEGROUP', 'AgeGroup', 'Category');
    const emit = (arr, ctx) => {
      for (const row of arr) {
        if (!Array.isArray(row)) continue;
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

// ---- Aggregate rows → best-time leaderboard per distance ----
function buildLeaderboard(rows, RACE, META, topN) {
  const TOP_N = topN || DEFAULT_TOP_N;
  // perDist[label] = Map(runnerKey -> bestEntry)
  const perDist = {};
  DIST_ORDER.forEach((d) => perDist[d] = new Map());

  for (const r of rows) {
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
        year: (meta && meta.year) || r._year || null
      });
    }
  }

  const byDistance = {};
  const summary = {};
  const top = (arr) => arr.slice(0, TOP_N);
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
    summary[d] = {
      runners: all.length, thai: tha.length,
      male: all.filter((e) => e.gender === 'M').length,
      female: all.filter((e) => e.gender === 'F').length
    };
  }
  return { byDistance, summary };
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
        console.log(`  + RaceResult ${label}: ${rows.length} rows`);
        extRows = extRows.concat(rows);
        extEvents.push({ code: ev.code, name: ev.name, timing, raceResultId: ev.raceResultId, rows: rows.length });
      } catch (e) {
        console.warn(`  ! RaceResult ${label} failed: ${e.message}`);
      }
    } else {
      // mylaps / sportstats / other — no fetcher yet; record but skip
      console.warn(`  ~ ${label}: timing "${timing || 'unknown'}" not yet supported by build-rank — skipped`);
      extEvents.push({ code: ev.code, name: ev.name, timing: timing || 'unknown', skipped: true });
    }
  }

  const topN = (reg.criteria && reg.criteria.topN) || DEFAULT_TOP_N;
  const { byDistance, summary } = buildLeaderboard(baseRows.concat(extRows), RACE, META, topN);

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    distances: DIST_ORDER,
    topN: topN,
    sources: {
      checkrace: baseRows.length,
      externalEvents: extEvents
    },
    summary,
    byDistance
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log('Wrote', OUT_PATH);
  console.log('Summary:', JSON.stringify(summary, null, 1));
  for (const d of DIST_ORDER) {
    const t = byDistance[d].tha[0];
    if (t) console.log(`  ${d} fastest Thai: ${t.name} ${t.time} (${t.event} ${t.year || ''})`);
  }
})().catch((e) => { console.error('build-rank failed:', e); process.exit(1); });
