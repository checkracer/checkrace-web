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

const TOP_N = 300;            // entries kept per distance per view (× 6 views)
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
function flagToCode(v) {
  const m = String(v || '').match(/flags\/([A-Za-z]{2})\.gif/);
  return m ? m[1].toUpperCase() : '';
}
async function fetchRaceResult(ev, base, defaultList) {
  const id = ev.raceResultId;
  const cfg = await getJSON(`${base}/${id}/results/config?lang=en`);
  const key = cfg.key;
  const contests = cfg.contests || {};
  const list = ev.listname || defaultList;
  const fields0 = [];
  const rows = [];
  for (const cid of Object.keys(contests)) {
    const url = `${base}/${id}/results/list?lang=en&key=${encodeURIComponent(key)}`
      + `&listname=${encodeURIComponent(list)}&contest=${encodeURIComponent(cid)}`;
    let p;
    try { p = await getJSON(url); } catch (e) { continue; }
    if (!p || !Array.isArray(p.DataFields) || !p.data) continue;
    const F = p.DataFields;
    const idx = (...names) => { for (const n of names) { const i = F.indexOf(n); if (i >= 0) return i; } return -1; };
    const iName = idx('DisplayName', 'Name', 'Lastname');
    const iNat = idx('NATION.FLAG', 'Nation', 'NATION');
    const iChip = idx('Finish.CHIP', 'ChipTime', 'TotalTime');
    const iGun = idx('Finish.GUN', 'GunTime');
    const iSex = idx('MaleFemale', 'Sex', 'Gender');
    for (const [grp, list2] of Object.entries(p.data)) {
      if (!Array.isArray(list2)) continue;
      // group key looks like "#<grp>_<contestName>" — use the contest name for distance
      const cname = contests[cid] || grp.split('_').slice(1).join('_');
      const dm = String(cname).match(/(\d+(?:\.\d+)?)/);
      const dist = dm ? parseFloat(dm[1]) : 0;
      for (const row of list2) {
        rows.push({
          first_name: iName >= 0 ? row[iName] : '',
          last_name: '',
          gender: iSex >= 0 ? String(row[iSex] || '').toUpperCase().charAt(0) : '',
          nationality: iNat >= 0 ? flagToCode(row[iNat]) : '',
          distance: dist,
          chip_time: iChip >= 0 ? row[iChip] : '',
          gun_time: iGun >= 0 ? row[iGun] : (iChip >= 0 ? row[iChip] : ''),
          event: ev.code || ('RR' + id),
          _year: ev.year,
          _source: 'raceresult:' + id
        });
      }
    }
  }
  return rows;
}

// ---- Aggregate rows → best-time leaderboard per distance ----
function buildLeaderboard(rows, RACE, META) {
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

  // 2) External RaceResult events from the registry
  const ext = (reg.raceResultEvents || []).filter((e) => e && e.raceResultId && e.included !== false);
  let extRows = [];
  const extEvents = [];
  for (const ev of ext) {
    try {
      const rows = await fetchRaceResult(ev, reg.raceResultBase, reg.raceResultList);
      console.log(`  + RaceResult ${ev.code || ev.raceResultId}: ${rows.length} rows`);
      extRows = extRows.concat(rows);
      extEvents.push({ code: ev.code, name: ev.name, raceResultId: ev.raceResultId, rows: rows.length });
    } catch (e) {
      console.warn(`  ! RaceResult ${ev.code || ev.raceResultId} failed: ${e.message}`);
    }
  }

  const { byDistance, summary } = buildLeaderboard(baseRows.concat(extRows), RACE, META);

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    distances: DIST_ORDER,
    topN: TOP_N,
    sources: {
      checkrace: baseRows.length,
      raceResultEvents: extEvents
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
