// Admin event CRUD — behind Cloudflare Access (/admin/* + /api/admin/*).
//   GET    ?status=pending|live|unpaid|all   → list (enriched with masters)
//   POST                                     → create (visible+paid)
//   PATCH  ?id=...                           → update
//   DELETE ?id=...                           → delete
import { json, adminEmail, randomId, slugify } from '../_util.js';

const PKG = ['free', 'basic', 'certified', 'premium'];

export const onRequestGet = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  const status = new URL(request.url).searchParams.get('status');
  let sql;
  if (status === 'pending') sql = 'SELECT * FROM events WHERE visible = 0 ORDER BY created_at DESC';
  else if (status === 'live') sql = 'SELECT * FROM events WHERE visible = 1 ORDER BY date ASC';
  else if (status === 'unpaid') sql = "SELECT * FROM events WHERE package_paid = 0 AND package != 'free' ORDER BY created_at DESC";
  else sql = 'SELECT * FROM events ORDER BY created_at DESC LIMIT 300';

  const { results: events } = await env.DB.prepare(sql).all();

  let orgMaster = {}, venueMaster = {};
  if ((events || []).some((e) => e.host_id || e.organizer_id)) {
    const { results: orgs } = await env.DB.prepare('SELECT id, name, logo_url FROM organizers').all();
    for (const o of orgs || []) orgMaster[o.id] = o;
  }
  if ((events || []).some((e) => e.venue_id)) {
    const { results: vs } = await env.DB.prepare('SELECT id, name FROM venues').all();
    for (const v of vs || []) venueMaster[v.id] = v;
  }
  const enriched = (events || []).map((e) => ({
    ...e,
    host_name: orgMaster[e.host_id]?.name || null,
    organizer_name: orgMaster[e.organizer_id]?.name || null,
    organizer_logo: orgMaster[e.organizer_id]?.logo_url || null,
    venue_name: venueMaster[e.venue_id]?.name || null,
  }));
  return json({ events: enriched });
};

export const onRequestPost = async ({ request, env }) => {
  const email = adminEmail(request, env);
  if (!email) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!b.name || !b.date) return json({ error: 'ต้องระบุชื่องาน + วันที่' }, 400);

  const id = randomId();
  const slug = `${slugify(b.name) || 'event'}-${id.slice(0, 6)}`;
  const pkg = PKG.includes(b.package) ? b.package : 'free';

  await env.DB.prepare(`
    INSERT INTO events (
      id, organizer_user_id, name, slug, date, register_open, register_close, venue, province, region, distance,
      type, status, fee, facebook_link, register_link, telephone, email,
      cover_image_url, promoter, package, package_paid, visible, notes, series, race_category, organizer_id,
      venue_id, host_id, website
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, email, b.name, slug, b.date, b.register_open || null, b.register_close || null,
    b.venue || null, b.province || null, b.region || null, b.distance || null,
    b.type || 'Road', b.status || 'เปิดรับสมัคร', b.fee || null,
    b.facebook_link || null, b.register_link || null, b.telephone || null, b.email || null,
    b.cover_image_url || null, b.promoter || null, pkg,
    1, b.visible === 0 ? 0 : 1, b.notes || null,
    b.series || null, b.race_category || null, b.organizer_id || null,
    b.venue_id || null, b.host_id || null, b.website || null,
  ).run();

  const { results } = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).all();
  return json(results[0], 201);
};

export const onRequestPatch = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const ALLOWED = [
    'name', 'venue', 'province', 'region', 'date', 'register_open', 'register_close', 'distance', 'type', 'status',
    'fee', 'facebook_link', 'register_link', 'telephone', 'email', 'cover_image_url', 'promoter', 'package',
    'package_paid', 'visible', 'notes', 'series', 'race_category', 'organizer_id', 'venue_id', 'host_id', 'website',
  ];
  const updates = {};
  for (const k of ALLOWED) if (b[k] !== undefined) updates[k] = b[k];
  if (!Object.keys(updates).length) return json({ error: 'No valid fields' }, 400);

  const fields = Object.keys(updates);
  const setSql = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  values.push(new Date().toISOString(), id);

  await env.DB.prepare(`UPDATE events SET ${setSql}, updated_at = ? WHERE id = ?`).bind(...values).run();
  const { results } = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).all();
  return json(results[0]);
};

export const onRequestDelete = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  return json({ deleted: id });
};
