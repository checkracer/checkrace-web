// Admin organizers master CRUD — behind Cloudflare Access.
// Organizers fill BOTH roles: events.host_id (เจ้าของงาน) and events.organizer_id (ออแกไนเซอร์).
import { json, adminEmail, randomId, norm } from '../_util.js';

export const onRequestGet = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const { results } = await env.DB.prepare(`
    SELECT o.*, (SELECT COUNT(*) FROM events e WHERE e.organizer_id = o.id OR e.host_id = o.id) AS event_count
    FROM organizers o ORDER BY o.name COLLATE NOCASE ASC
  `).all();
  return json({ organizers: results || [] });
};

export const onRequestPost = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const name = (b.name || '').trim();
  if (!name) return json({ error: 'ต้องระบุชื่อผู้จัดงาน' }, 400);

  const name_norm = norm(name);
  const { results: ex } = await env.DB.prepare('SELECT * FROM organizers WHERE name_norm = ?').bind(name_norm).all();
  if (ex?.[0]) return json(ex[0], 200);

  const id = randomId();
  const kind = ['owner', 'organizer'].includes(b.kind) ? b.kind : 'organizer';
  await env.DB.prepare(`
    INSERT INTO organizers (id, name, name_norm, kind, logo_url, facebook, website, phone, email, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(id, name, name_norm, kind, b.logo_url || null, b.facebook || null, b.website || null,
    b.phone || null, b.email || null, b.notes || null).run();

  const { results } = await env.DB.prepare('SELECT * FROM organizers WHERE id = ?').bind(id).all();
  return json(results[0], 201);
};

export const onRequestPatch = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const ALLOWED = ['name', 'kind', 'logo_url', 'facebook', 'website', 'phone', 'email', 'notes'];
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
    await env.DB.prepare(`UPDATE organizers SET ${setSql}, updated_at = ? WHERE id = ?`).bind(...values).run();
  } catch { return json({ error: 'ชื่อผู้จัดงานนี้มีอยู่แล้ว' }, 409); }

  const { results } = await env.DB.prepare('SELECT * FROM organizers WHERE id = ?').bind(id).all();
  return json(results[0]);
};

export const onRequestDelete = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  await env.DB.prepare('UPDATE events SET organizer_id = NULL WHERE organizer_id = ?').bind(id).run();
  await env.DB.prepare('UPDATE events SET host_id = NULL WHERE host_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM organizers WHERE id = ?').bind(id).run();
  return json({ deleted: id });
};
