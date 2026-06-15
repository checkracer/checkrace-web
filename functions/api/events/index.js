// GET /api/events — public running calendar (visible + paid events only).
// Enriches each row with master names (host / organizer / venue). Ported from the
// running-calendar-module skill, adapted to checkrace conventions.
import { json } from '../_util.js';

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

  return json({ events });
};
