// GET /api/events — public running calendar (visible + paid events only).
// Enriches each row with master names (host / organizer / venue), then MERGES the
// public WND.run calendar (live mirror, edge-cached ~10min). Local events win on dedup.
// Ported from the running-calendar-module skill, adapted to checkrace conventions.
import { json } from '../_util.js';

const WND_EVENTS_URL = 'https://wnd.run/api/events';
const slug = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '-');
const dedupKey = (e) => `${String(e.date || '').slice(0, 10)}__${slug(e.name)}`;

// Fetch the WND public calendar (already filtered visible+paid and enriched with
// host_name/organizer_name/venue). Edge-cached so we don't hit WND on every request.
async function fetchWndEvents() {
  try {
    const res = await fetch(WND_EVENTS_URL, {
      cf: { cacheTtl: 600, cacheEverything: true },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.events || []).map((e) => ({ ...e, id: 'wnd:' + (e.id || e.slug || slug(e.name)), source: 'wnd' }));
  } catch {
    return []; // WND down → checkrace still serves its own events
  }
}

export const onRequestGet = async ({ env }) => {
  if (!env.DB) return json({ events: [], error: 'DB not bound' });

  const { results } = await env.DB
    .prepare('SELECT * FROM events WHERE visible = 1 AND package_paid = 1 ORDER BY date ASC')
    .all();
  const events = results || [];

  // Masters are small — fetch all & map (avoids D1's 100 bound-variable IN() limit).
  const needsOrg = events.some((e) => e.host_id || e.organizer_id);
  const needsVenue = events.some((e) => e.venue_id);
  let orgById = {}, venueById = {};
  if (needsOrg) {
    const { results: orgs } = await env.DB.prepare('SELECT id, name, logo_url FROM organizers').all();
    for (const o of orgs || []) orgById[o.id] = o;
  }
  if (needsVenue) {
    const { results: vs } = await env.DB.prepare('SELECT id, name, province FROM venues').all();
    for (const v of vs || []) venueById[v.id] = v;
  }
  for (const e of events) {
    const host = orgById[e.host_id];
    const org = orgById[e.organizer_id];
    if (host) { e.host_name = host.name; e.host_logo = host.logo_url; e.promoter = host.name; }
    if (org) { e.organizer_name = org.name; e.organizer_logo = org.logo_url; }
    const v = venueById[e.venue_id];
    if (v) { e.venue_name = v.name; e.venue = v.name; }
  }

  // Live-mirror the WND.run public calendar, de-duped (local checkrace events win).
  const wnd = await fetchWndEvents();
  const seen = new Set(events.map(dedupKey));
  const merged = events.concat(wnd.filter((e) => !seen.has(dedupKey(e))));
  merged.sort((a, b) => String(a.date || '').slice(0, 10) < String(b.date || '').slice(0, 10) ? -1 : 1);

  return json({ events: merged });
};
