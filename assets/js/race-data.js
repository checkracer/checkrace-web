/* ================================================================
   Raceup Hub — Shared Race Data Module
   Used by: rank.html, returning.html, stat.html (Stat sub-pages)
   ================================================================ */

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
window.RACE = window.RACE || {};
RACE.API_URL = 'https://script.google.com/macros/s/AKfycbyZWTlSJObtk_nu0yJTon5PWFyf75K4kxvOP6LJIyXdE0FT2z5EdINM4IWtw5qm1SMMvg/exec';

// ═══════════════════════════════════════════════
// EVENT META — 47 events
// ═══════════════════════════════════════════════
RACE.EVENT_META = {
  // Scenic HM Chanthaburi (CSMH)
  "CSMH17":{name:"Scenic HM Chanthaburi",year:2017,series:"Scenic"},
  "CSMH18":{name:"Scenic HM Chanthaburi",year:2018,series:"Scenic"},
  "CSMH19":{name:"Scenic HM Chanthaburi",year:2019,series:"Scenic"},
  "CSMH20":{name:"Scenic HM Chanthaburi",year:2020,series:"Scenic"},
  "CSMH22":{name:"Scenic HM Chanthaburi",year:2022,series:"Scenic"},
  "CSMH23":{name:"Scenic HM Chanthaburi",year:2023,series:"Scenic"},
  "CSMH24":{name:"Scenic HM Chanthaburi",year:2024,series:"Scenic"},
  "CSMH25":{name:"Scenic HM Chanthaburi",year:2025,series:"Scenic"},
  // Scenic FM Chanthaburi (CSM)
  "CSM16":{name:"Scenic Marathon Chanthaburi",year:2016,series:"Scenic"},
  "CSM17":{name:"Scenic Marathon Chanthaburi",year:2017,series:"Scenic"},
  "CSM18":{name:"Scenic Marathon Chanthaburi",year:2018,series:"Scenic"},
  "CSM19":{name:"Scenic Marathon Chanthaburi",year:2019,series:"Scenic"},
  "CSM24":{name:"Scenic Marathon Chanthaburi",year:2024,series:"Scenic"},
  "CSM25":{name:"Scenic Marathon Chanthaburi",year:2025,series:"Scenic"},
  // Scenic HM Pranburi (PSMH)
  "PSMH22":{name:"Scenic HM Pranburi",year:2022,series:"Scenic"},
  "PSMH23":{name:"Scenic HM Pranburi",year:2023,series:"Scenic"},
  "PSMH24":{name:"Scenic HM Pranburi",year:2024,series:"Scenic"},
  "PSMH25":{name:"Scenic HM Pranburi",year:2025,series:"Scenic"},
  "PSMH26":{name:"Scenic HM Pranburi",year:2026,series:"Scenic"},
  // Scenic FM/HM Rayong (RSM/RSMH)
  "RSM19":{name:"Scenic Marathon Rayong",year:2019,series:"Scenic"},
  "RSMH23":{name:"Scenic HM Rayong",year:2023,series:"Scenic"},
  "RSMH24":{name:"Scenic HM Rayong",year:2024,series:"Scenic"},
  "RSMH25":{name:"Scenic HM Rayong",year:2025,series:"Scenic"},
  // Scenic HM Krabi (KSMH)
  "KSMH19":{name:"Scenic HM Krabi",year:2019,series:"Scenic"},
  "KSMH20":{name:"Scenic HM Krabi",year:2020,series:"Scenic"},
  "KSMH22":{name:"Scenic HM Krabi",year:2022,series:"Scenic"},
  "KSMH23":{name:"Scenic HM Krabi",year:2023,series:"Scenic"},
  "KSMH24":{name:"Scenic HM Krabi",year:2024,series:"Scenic"},
  "KSMH25":{name:"Scenic HM Krabi",year:2025,series:"Scenic"},
  // Scenic HM Nakhon Phanom
  "NSMH25":{name:"Scenic HM Nakhon Phanom",year:2025,series:"Scenic"},
  // Korat Marathon
  "KRM22":{name:"Korat Marathon",year:2022,series:"Korat"},
  "KRM23":{name:"Korat Marathon",year:2023,series:"Korat"},
  "KRM24":{name:"Korat Marathon",year:2024,series:"Korat"},
  "KRM25":{name:"Korat Marathon",year:2025,series:"Korat"},
  // Khao Yai Marathon
  "KYM25":{name:"Khao Yai Marathon",year:2025,series:"KhaoYai"},
  "KYM26":{name:"Khao Yai Marathon",year:2026,series:"KhaoYai"},
  // UP League
  "PO24":{name:"Pocari Run",year:2024,series:"UPLeague"},
  "PO25":{name:"Pocari Run",year:2025,series:"UPLeague"},
  "PO26":{name:"Pocari Run",year:2026,series:"UPLeague"},
  "AMN25":{name:"Amino Vital Run",year:2025,series:"UPLeague"},
  "AMN26":{name:"Amino Vital Run",year:2026,series:"UPLeague"},
  "GR23":{name:"Garmin Run Thailand",year:2023,series:"UPLeague"},
  "GR24":{name:"Garmin Run Thailand",year:2024,series:"UPLeague"},
  "GR25":{name:"Garmin Run Thailand",year:2025,series:"UPLeague"},
  "WR24":{name:"Allianz Ayudhaya World Run",year:2024,series:"UPLeague"},
  "WR25":{name:"Allianz Ayudhaya World Run",year:2025,series:"UPLeague"},
  "KTJ23":{name:"10K Thailand Championship",year:2023,series:"UPLeague"},
  "KTJ24":{name:"10K Thailand Championship",year:2024,series:"UPLeague"},
  "KTJ25":{name:"10K Thailand Championship",year:2025,series:"UPLeague"},
  // Supersports 10 Mile Run
  "SSP26":{name:"Supersports 10 Mile Run",year:2026,series:"UPLeague"}
};

// ═══════════════════════════════════════════════
// IOC → ISO 2-letter for flag emoji
// ═══════════════════════════════════════════════
RACE.IOC_TO_ISO = {THA:'TH',ETH:'ET',KEN:'KE',JPN:'JP',USA:'US',GBR:'GB',CRO:'HR',RUS:'RU',POL:'PL',BEL:'BE',AUS:'AU',LAO:'LA',GER:'DE',FRA:'FR',IND:'IN',CHN:'CN',KOR:'KR',MYS:'MY',SGP:'SG',NZL:'NZ',CAN:'CA',SWE:'SE',FIN:'FI',NOR:'NO',DEN:'DK',ITA:'IT',ESP:'ES',POR:'PT',NED:'NL',SUI:'CH',HKG:'HK',TWN:'TW',PHI:'PH',INA:'ID',VIE:'VN',CAM:'KH',MMR:'MM',BRN:'BN',RSA:'ZA',MEX:'MX',BRA:'BR',ARG:'AR',COL:'CO',PER:'PE',CHL:'CL',ECU:'EC',URU:'UY',ISR:'IL',ARE:'AE',QAT:'QA',BHR:'BH',KSA:'SA',JOR:'JO',TUR:'TR',UKR:'UA',CZE:'CZ',HUN:'HU',ROU:'RO',BUL:'BG',SRB:'RS',MNE:'ME',BIH:'BA',MKD:'MK',ALB:'AL',GRE:'GR',CYP:'CY',MLT:'MT',LUX:'LU',IRL:'IE',ISL:'IS',UGA:'UG',ERI:'ER',MAR:'MA'};

RACE.SCENIC_PREFIXES = ['PSMH','CSMH','RSMH','RSM','KSMH','CSM','NSMH'];
RACE.UPLEAGUE_PREFIXES = ['PO','AMN','GR','WR','KTJ','SSP'];

// ═══════════════════════════════════════════════
// DATA FETCH — direct browser fetch from External Race Ranking
// (Hub API server-pagination disabled because External blocks server-to-server)
// Uses sessionStorage cache for subsequent visits in same tab.
// ═══════════════════════════════════════════════

const RACE_CACHE_KEY = 'raceup_race_cache_v1';
const RACE_CACHE_TTL = 30 * 60 * 1000;  // 30 min in sessionStorage

RACE.fetchAllResults = async function() {
  if (RACE._cached) return RACE._cached;

  // Try sessionStorage (persists across page reloads within same tab)
  try {
    const raw = sessionStorage.getItem(RACE_CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj.ts && Date.now() - obj.ts < RACE_CACHE_TTL && Array.isArray(obj.data)) {
        RACE._cached = obj.data;
        return obj.data;
      }
    }
  } catch (e) { /* cache corrupted — refetch */ }

  let data;

  // Strategy 1: JSONP (bypasses CORS — works if Apps Script supports ?callback=)
  if (window.JSONP && window.JSONP.call) {
    try {
      data = await window.JSONP.call(RACE.API_URL, { action: 'getAllResults' }, 30000);
    } catch (e1) {
      console.warn('JSONP fetch failed, trying direct fetch:', e1.message);
    }
  }

  // Strategy 2: Direct fetch (works if Apps Script allows CORS or user has session)
  if (!data) {
    const resp = await fetch(RACE.API_URL + '?action=getAllResults', { credentials: 'include' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();
    if (data && data.error) throw new Error(data.error);
  }

  if (!Array.isArray(data)) throw new Error('Race data not array: ' + (typeof data));

  // Normalize
  data.forEach(r => {
    r.distance = RACE.normDist(parseFloat(r.distance) || 0);
    if (!r.status) r.status = 'Finish';
    if (r.gender) r.gender = String(r.gender).toUpperCase().charAt(0);
  });

  RACE._cached = data;
  // Persist to sessionStorage
  try {
    sessionStorage.setItem(RACE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) { /* quota exceeded — skip */ }
  return data;
};

/** Paginated fetch — runs entirely in browser using cached full dataset. */
RACE.fetchPage = async function(opts) {
  return await RACE._fallbackFetchPage(opts || {});
};

/** Returning runner stats — computed in browser. */
RACE.fetchReturningStats = async function(scope) {
  return await RACE._fallbackReturningStats(scope || 'all');
};

/* ===== FALLBACKS: client-side compute from full dataset ===== */

RACE._fallbackFetchPage = async function(opts) {
  const all = await RACE.fetchAllResults();  // direct fetch from external API
  let rows = all.slice();

  // Apply filters
  if (opts.group && opts.group !== 'all') {
    const sFilter = opts.group;
    rows = rows.filter(r => {
      if (sFilter === 'Scenic')   return RACE.isScenicEvent(r.event);
      if (sFilter === 'UPLeague') return RACE.isUPLeagueEvent(r.event);
      if (sFilter === 'Korat')    return RACE.isKoratEvent(r.event);
      if (sFilter === 'KhaoYai')  return RACE.isKhaoYaiEvent(r.event);
      return true;
    });
  }
  if (opts.event && opts.event !== 'all') rows = rows.filter(r => r.event === opts.event);
  if (opts.distance && opts.distance > 0) rows = rows.filter(r => Math.abs(r.distance - opts.distance) < 0.5);
  if (opts.gender && opts.gender !== 'all') rows = rows.filter(r => r.gender === opts.gender);
  if (opts.ag && opts.ag !== 'all') {
    const ag = String(opts.ag).toLowerCase();
    rows = rows.filter(r => String(r.category || '').toLowerCase().indexOf(ag) >= 0);
  }
  if (opts.rankMode && opts.rankMode !== 'all') {
    if (opts.rankMode === 'intlM') rows = rows.filter(r => r.gender === 'M');
    else if (opts.rankMode === 'intlF') rows = rows.filter(r => r.gender === 'F');
    else if (opts.rankMode === 'thaiM' || opts.rankMode === 'thaiF') {
      rows = rows.filter(r => {
        const n = String(r.nationality||'').toUpperCase();
        if (n !== 'THA' && n !== 'THAI' && n !== 'THAILAND') return false;
        return r.gender === (opts.rankMode === 'thaiM' ? 'M' : 'F');
      });
    }
  }
  if (opts.search) {
    const q = String(opts.search).toLowerCase();
    rows = rows.filter(r => {
      const hay = ((r.bib_no||'')+' '+(r.first_name||'')+' '+(r.last_name||'')+' '+(r.nationality||'')+' '+(r.event||'')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  // Stats meta
  let male = 0, female = 0;
  const evSet = {};
  rows.forEach(r => {
    if (r.gender === 'M') male++;
    else if (r.gender === 'F') female++;
    if (r.event) evSet[r.event] = true;
  });
  const eventCount = Object.keys(evSet).length;

  // Sort
  const dir = (opts.sortDir === 'desc') ? -1 : 1;
  const col = opts.sortCol || 'chip_time';
  rows.sort((a, b) => {
    let va, vb;
    if (col === 'chip_time') { va = RACE.bestTime(a); vb = RACE.bestTime(b); }
    else if (col === 'gun_time') { va = RACE.timeToSec(a.gun_time); vb = RACE.timeToSec(b.gun_time); }
    else if (col === 'distance' || col === 'rank') { va = parseFloat(a[col])||0; vb = parseFloat(b[col])||0; }
    else { va = String(a[col]||'').toLowerCase(); vb = String(b[col]||'').toLowerCase(); }
    if (va < vb) return -1 * dir;
    if (va > vb) return  1 * dir;
    return 0;
  });
  rows.forEach((r, i) => { r._rank = i + 1; });

  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(500, Math.max(10, Number(opts.limit) || 100));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return { rows: rows.slice(start, start + limit), total, page, limit, totalPages, male, female, eventCount };
};

RACE._fallbackReturningStats = async function(scope) {
  const all = await RACE.fetchAllResults();
  let rows = all;
  if (scope !== 'all') {
    if (scope.indexOf('venue:') === 0) {
      const p = scope.substring(6);
      rows = rows.filter(r => String(r.event || '').toUpperCase().indexOf(p) === 0);
    } else {
      rows = rows.filter(r => RACE.getSeries(r.event) === scope);
    }
  }

  const runnerMap = {};
  rows.forEach(r => {
    const name = ((r.first_name||'') + ' ' + (r.last_name||'')).trim().toUpperCase();
    if (name.length < 3) return;
    (runnerMap[name] = runnerMap[name] || []).push(r);
  });

  const eventSet = {}; rows.forEach(r => { eventSet[r.event] = true; });
  const VENUE_PREFIXES = [['PSMH','Pranburi'],['CSMH','Chanthaburi'],['RSMH','Rayong'],['RSM','Rayong'],
    ['KSMH','Krabi'],['CSM','Chanthaburi'],['NSMH','NakhonPhanom'],['KRM','Korat'],['KYM','KhaoYai']];
  function getVenue(ev) {
    const u = (ev||'').toUpperCase();
    for (let i = 0; i < VENUE_PREFIXES.length; i++) if (u.indexOf(VENUE_PREFIXES[i][0]) === 0) return VENUE_PREFIXES[i][1];
    return ev;
  }

  const D = {
    totalRecords: rows.length, numEvents: Object.keys(eventSet).length, uniqueRunners: Object.keys(runnerMap).length,
    oneTime:0, returning:0, loyal3:0, loyal5:0, loyal10:0,
    eventCountDist:{}, seriesStats:{}, venueStats:{},
    genderReturn:{ M:{total:0,returning:0}, F:{total:0,returning:0} },
    crossTwo:0, crossThree:0, distUpgrade:0, distDowngrade:0, distSame:0, top20:[]
  };

  const seriesLoyalty = {}, venueLoyalty = {}, runnerList = [];
  Object.keys(runnerMap).forEach(name => {
    const records = runnerMap[name];
    const events = {}; records.forEach(r => { events[r.event] = true; });
    const eventArr = Object.keys(events); const n = eventArr.length;
    D.eventCountDist[n] = (D.eventCountDist[n]||0) + 1;
    if (n === 1) D.oneTime++;
    if (n >= 2) D.returning++;
    if (n >= 3) D.loyal3++;
    if (n >= 5) D.loyal5++;
    if (n >= 10) D.loyal10++;
    const g = records[0].gender;
    if (g === 'M' || g === 'F') {
      D.genderReturn[g].total++;
      if (n >= 2) D.genderReturn[g].returning++;
    }
    records.forEach(r => {
      const s = RACE.getSeries(r.event);
      if (!seriesLoyalty[s]) seriesLoyalty[s] = { total:{}, returning:{} };
      seriesLoyalty[s].total[name] = true;
    });
    const seriesEvMap = {};
    records.forEach(r => {
      const s = RACE.getSeries(r.event);
      if (!seriesEvMap[s]) seriesEvMap[s] = {};
      seriesEvMap[s][r.event] = true;
    });
    Object.keys(seriesEvMap).forEach(s => {
      if (Object.keys(seriesEvMap[s]).length >= 2) seriesLoyalty[s].returning[name] = true;
    });
    const venueEvMap = {};
    records.forEach(r => {
      const v = getVenue(r.event);
      if (!venueLoyalty[v]) venueLoyalty[v] = { total:{}, returning:{}, loyal3:{} };
      venueLoyalty[v].total[name] = true;
      if (!venueEvMap[v]) venueEvMap[v] = {};
      venueEvMap[v][r.event] = true;
    });
    Object.keys(venueEvMap).forEach(v => {
      const cnt = Object.keys(venueEvMap[v]).length;
      if (cnt >= 2) venueLoyalty[v].returning[name] = true;
      if (cnt >= 3) venueLoyalty[v].loyal3[name] = true;
    });
    const sSet = {}; records.forEach(r => { sSet[RACE.getSeries(r.event)] = true; });
    const ns = Object.keys(sSet).length;
    if (ns >= 2) D.crossTwo++;
    if (ns >= 3) D.crossThree++;
    if (n >= 2) {
      const dists = records.map(r => r.distance).filter(d => d > 0);
      if (dists.length >= 2) {
        if (dists[dists.length-1] > dists[0] + 5) D.distUpgrade++;
        else if (dists[dists.length-1] < dists[0] - 5) D.distDowngrade++;
        else D.distSame++;
      }
    }
    runnerList.push({ name, gender: g, events: n, eventList: eventArr.sort() });
  });
  runnerList.sort((a,b) => b.events - a.events);
  D.top20 = runnerList.slice(0, 20);
  Object.keys(seriesLoyalty).forEach(s => {
    D.seriesStats[s] = { total: Object.keys(seriesLoyalty[s].total).length, returning: Object.keys(seriesLoyalty[s].returning).length };
  });
  Object.keys(venueLoyalty).forEach(v => {
    const t = Object.keys(venueLoyalty[v].total).length;
    if (t >= 50) D.venueStats[v] = {
      total: t, returning: Object.keys(venueLoyalty[v].returning).length, loyal3: Object.keys(venueLoyalty[v].loyal3).length
    };
  });
  return D;
};

// ═══════════════════════════════════════════════
// HELPERS — Time
// ═══════════════════════════════════════════════
RACE.timeToSec = function(t) {
  if (!t || t === '0:00:00' || t === '0:0:0' || t === '-') return 999999;
  const p = String(t).split(':');
  let sec = 0;
  if (p.length === 3) sec = parseInt(p[0])*3600 + parseInt(p[1])*60 + parseFloat(p[2]);
  else if (p.length === 2) sec = parseInt(p[0])*60 + parseFloat(p[1]);
  else return 999999;
  return sec <= 0 ? 999999 : sec;
};

RACE.secToTime = function(s) {
  if (s >= 999000) return '-';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  return h + ':' + (m<10?'0':'') + m + ':' + (sec<10?'0':'') + sec;
};

// Min realistic times per distance (seconds) — anything faster is a bad read
RACE.MIN_RACE_TIME = {5:720, 10:1500, 21.1:3300, 42.195:6900};
// Max realistic times per distance (seconds) — anything slower is a gun time
// recorded as time-of-day (clock), not elapsed. Generous, past any real cutoff.
RACE.MAX_RACE_TIME = {5:10800, 10:14400, 21.1:18000, 42.195:28800};
RACE.MAX_CHIP_GUN_DIFF = 2700; // 45 min — beyond any real start-line delay at these races

RACE.isGunTimeOfDay = function(r) {
  const ct = RACE.timeToSec(r.chip_time), gt = RACE.timeToSec(r.gun_time);
  if (ct < 999999 && gt < 999999 && Math.abs(ct - gt) > RACE.MAX_CHIP_GUN_DIFF) return true;
  return false;
};

RACE.isTimeSuspicious = function(sec, dist) {
  const minT = RACE.MIN_RACE_TIME[dist];
  return minT && sec < minT;
};
RACE.isImplausiblyLong = function(sec, dist) {
  const maxT = RACE.MAX_RACE_TIME[dist];
  return maxT && sec > maxT;
};

// Resolve the trustworthy finish time. chip is preferred, BUT when chip and
// gun disagree by more than 45 min one of them is corrupt:
//   • gun absurdly long  → gun is a time-of-day clock value → trust chip
//   • gun a plausible elapsed time → chip is a bad mat read → trust gun
// Returns { sec, src } (sec 999990 = present but unusable, 999999 = none).
RACE._resolve = function(r) {
  const ct = RACE.timeToSec(r.chip_time);
  const gt = RACE.timeToSec(r.gun_time);
  const dist = parseFloat(r.distance) || 0;
  const cOk = ct < 999999, gOk = gt < 999999;

  if (cOk && gOk && Math.abs(gt - ct) > RACE.MAX_CHIP_GUN_DIFF) {
    if (RACE.isImplausiblyLong(gt, dist)) {
      // gun is time-of-day garbage → trust chip if it is a sane race time
      if (!RACE.isTimeSuspicious(ct, dist)) return { sec: ct, src: 'chip' };
      return { sec: 999990, src: null };
    }
    // gun is a plausible elapsed time → chip is artificially fast → trust gun
    if (!RACE.isTimeSuspicious(gt, dist) && !RACE.isImplausiblyLong(gt, dist)) return { sec: gt, src: 'gun' };
    return { sec: 999990, src: null };
  }

  // consistent, or only one value present
  if (cOk && !RACE.isTimeSuspicious(ct, dist)) return { sec: ct, src: 'chip' };
  if (gOk && !RACE.isTimeSuspicious(gt, dist) && !RACE.isImplausiblyLong(gt, dist)) return { sec: gt, src: 'gun' };
  if (cOk) return { sec: 999990, src: null };
  if (gOk && !RACE.isImplausiblyLong(gt, dist)) return { sec: gt, src: 'gun' };
  return { sec: 999999, src: null };
};

RACE.bestTime = function(r) { return RACE._resolve(r).sec; };

RACE.bestTimeStr = function(r) {
  const res = RACE._resolve(r);
  if (res.src === 'chip') return r.chip_time;
  if (res.src === 'gun') return r.gun_time + ' (gun)';
  if (res.sec === 999990) return (r.chip_time || r.gun_time || '-') + ' ⚠️';
  return '-';
};

RACE.cleanGunStr = function(r) {
  if (RACE.isGunTimeOfDay(r)) return '-';
  const gt = r.gun_time;
  if (!gt || gt === '0:00:00') return '-';
  return gt;
};

// ═══════════════════════════════════════════════
// HELPERS — Distance
// ═══════════════════════════════════════════════
RACE.normDist = function(d) {
  if (d >= 40 && d <= 43) return 42.195;
  if (d >= 20 && d <= 22) return 21.1;
  if (d === 16 || d === 16.1) return 16.09;
  if (d === 8 || d === 8.05) return 8.047;
  return d;
};

RACE.distLabel = function(d) {
  if (d === 42.195) return '42K (FM)';
  if (d === 21.1) return '21K (HM)';
  if (d === 16.09) return '10 Miles';
  if (d === 8.047) return '5 Miles';
  return d + 'K';
};

RACE.distBucket = function(d) {
  if (d >= 42) return 42.195;
  if (d >= 21) return 21.1;
  if (d >= 10) return 10;
  if (d >= 5) return 5;
  return d;
};

// ═══════════════════════════════════════════════
// HELPERS — Series
// ═══════════════════════════════════════════════
RACE.isScenicEvent = function(eid) {
  const m = RACE.EVENT_META[eid];
  if (m && m.series === 'Scenic') return true;
  return RACE.SCENIC_PREFIXES.some(p => eid.indexOf(p) === 0);
};
RACE.isUPLeagueEvent = function(eid) {
  const m = RACE.EVENT_META[eid];
  if (m && m.series === 'UPLeague') return true;
  return RACE.UPLEAGUE_PREFIXES.some(p => eid.indexOf(p) === 0);
};
RACE.isKoratEvent = function(eid) {
  const m = RACE.EVENT_META[eid];
  return m && m.series === 'Korat';
};
RACE.isKhaoYaiEvent = function(eid) {
  const m = RACE.EVENT_META[eid];
  return m && m.series === 'KhaoYai';
};
RACE.getSeries = function(eid) {
  const m = RACE.EVENT_META[eid];
  if (m) return m.series;
  if (RACE.isScenicEvent(eid)) return 'Scenic';
  if (RACE.isUPLeagueEvent(eid)) return 'UPLeague';
  return 'Other';
};

// ═══════════════════════════════════════════════
// HELPERS — Format
// ═══════════════════════════════════════════════
RACE.fmtN = function(n) {
  return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
};

RACE.natFlag = function(nat) {
  if (!nat) return '';
  const code = String(nat).toUpperCase();
  const iso = RACE.IOC_TO_ISO[code] || code;
  if (iso.length === 2) {
    const flag = String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65) +
                 String.fromCodePoint(0x1F1E6 + iso.charCodeAt(1) - 65);
    return '<span title="' + code + '" style="font-size:14px">' + flag + '</span>';
  }
  return '<span class="flag">' + code + '</span>';
};

RACE.evBadge = function(eid) {
  const m = RACE.EVENT_META[eid];
  let cls = 'ev-badge';
  const u = (eid || '').toUpperCase();
  if (u.indexOf('PSMH') === 0) cls = 'ev-psmh';
  else if (u.indexOf('CSMH') === 0) cls = 'ev-csmh';
  else if (u.indexOf('RSMH') === 0 || u.indexOf('RSM') === 0) cls = 'ev-rsmh';
  else if (u.indexOf('KSMH') === 0) cls = 'ev-ksmh';
  else if (u.indexOf('CSM') === 0) cls = 'ev-csm';
  else if (u.indexOf('NSMH') === 0) cls = 'ev-nsmh';
  else if (u.indexOf('KRM') === 0) cls = 'ev-krm';
  else if (u.indexOf('KYM') === 0) cls = 'ev-kym';
  else if (u.indexOf('PO') === 0) cls = 'ev-pocari';
  else if (u.indexOf('GR') === 0) cls = 'ev-garmin';
  else if (u.indexOf('WR') === 0) cls = 'ev-allianz';
  else if (u.indexOf('KTJ') === 0) cls = 'ev-lg10k';
  else if (u.indexOf('AMN') === 0) cls = 'ev-amino';
  else if (u.indexOf('SSP') === 0) cls = 'ev-ssp';
  return '<span class="ev-badge ' + cls + '">' + eid + '</span>';
};
