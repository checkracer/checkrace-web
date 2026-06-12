// POST /api/blog/rate  { slug, rating:1..5 }  — anonymous star rating, 1 per device.
import { json, round1, voterKey } from '../_util.js';

export const onRequestPost = async ({ request, env }) => {
  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const slug = String(b.slug || '').trim();
  const rating = parseInt(b.rating, 10);
  if (!slug) return json({ error: 'slug required' }, 400);
  if (!(rating >= 1 && rating <= 5)) return json({ error: 'rating must be 1..5' }, 400);

  const exists = await env.DB
    .prepare(`SELECT 1 FROM blog_posts WHERE slug = ? AND status = 'published'`)
    .bind(slug).first();
  if (!exists) return json({ error: 'Not found' }, 404);

  const voter = await voterKey(request);
  await env.DB.prepare(
    `INSERT INTO blog_ratings (slug, voter, rating) VALUES (?, ?, ?)
     ON CONFLICT(slug, voter) DO UPDATE SET rating = excluded.rating, updated_at = CURRENT_TIMESTAMP`,
  ).bind(slug, voter, rating).run();

  const agg = await env.DB
    .prepare(`SELECT COUNT(*) AS c, AVG(rating) AS a FROM blog_ratings WHERE slug = ?`)
    .bind(slug).first();

  return json({ ok: true, rating: { count: agg?.c || 0, avg: round1(agg?.a), mine: rating } });
};
