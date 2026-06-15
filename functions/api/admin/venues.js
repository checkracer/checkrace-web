// Admin venues master CRUD — behind Cloudflare Access. events.venue_id -> venues.id.
import { json, adminEmail, randomId, norm } from '../_util.js';

export const onRequestGet = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const { results } = await env.DB.prepare(`
    SELECT v.*, (SELECT COUNT(*) FROM events e WHERE e.venue_id = v.id) AS event_count
    FROM venues v ORDER BY v.name COLLATE NOCASE ASC
  `).all();
  return json({ venues: results || [] });
};

export const onRequestPost = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const name = (b.name || '').trim();
  if (!name) return json({ error: 'ต้องระบุชื่อสถานที่' }, 400);

  const name_norm = norm(name);
  const { results: ex } = await env.DB.prepare('SELECT * FROM venues WHERE name_norm = ?').bind(name_norm).all();
  if (ex?.[0]) return json(ex[0], 200);

  const id = randomId();
  await env.DB.prepare(`
    INSERT INTO venues (id, name, name_norm, province, region, type, notes) VALUES (?,?,?,?,?,?,?)
  `).bind(id, name, name_norm, b.province || null, b.region || null, b.type || null, b.notes || null).run();

  const { results } = await env.DB.prepare('SELECT * FROM venues WHERE id = ?').bind(id).all();
  return json(results[0], 201);
};

export const onRequestPatch = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const ALLOWED = ['name', 'province', 'region', 'type', 'notes'];
  const updates = {};
  for (const k of ALLOWED) if (b[k] !== undefined) updates[k] = b[k];
  if (b.name !== undefined) {
    if (!String(b.name).trim()) return json({ error: 'ชื่อห้ามว่าง' }, 400);
    updates.name_norm = norm(b.name);
  }
  if (!Object.keys(updates).length) return json({ error: 'No valid fields' }, 400);

  const fields = Object.keys(updates);
  const setSql = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  values.push(new Date().toISOString(), id);
  try {
    await env.DB.prepare(`UPDATE venues SET ${setSql}, updated_at = ? WHERE id = ?`).bind(...values).run();
  } catch { return json({ error: 'ชื่อสถานที่นี้มีอยู่แล้ว' }, 409); }

  const { results } = await env.DB.prepare('SELECT * FROM venues WHERE id = ?').bind(id).all();
  return json(results[0]);
};

export const onRequestDelete = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  await env.DB.prepare('UPDATE events SET venue_id = NULL WHERE venue_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM venues WHERE id = ?').bind(id).run();
  return json({ deleted: id });
};
