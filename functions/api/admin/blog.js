// Admin blog CRUD — behind Cloudflare Access (must protect /api/admin/* + /admin/*).
//   GET    /api/admin/blog          → list ALL posts (incl. drafts)
//   POST   /api/admin/blog          → create / update (upsert by slug)
//   DELETE /api/admin/blog?slug=... → delete a post (+ its ratings)
import { json, adminEmail, splitTags, slugify } from '../_util.js';

export const onRequestGet = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const r = await env.DB.prepare(
    `SELECT slug, title, language, category, excerpt, cover_image, cover_alt, body, author, tags,
            featured, status, views, published_at, updated_at
       FROM blog_posts
      ORDER BY COALESCE(published_at, created_at) DESC`,
  ).all();
  return json({ posts: (r?.results || []).map((p) => ({ ...p, featured: p.featured === 1, tags: splitTags(p.tags) })) });
};

export const onRequestPost = async ({ request, env }) => {
  const email = adminEmail(request, env);
  if (!email) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!b.title) return json({ error: 'title required' }, 400);
  const slug = (b.slug && String(b.slug).trim()) || slugify(b.title);
  if (!slug) return json({ error: 'could not derive slug' }, 400);

  const status = b.status === 'published' ? 'published' : 'draft';
  const published_at = status === 'published'
    ? (b.published_at || new Date().toISOString())
    : (b.published_at || null);

  await env.DB.prepare(
    `INSERT INTO blog_posts
       (slug, title, language, category, excerpt, cover_image, cover_alt, body, author, tags, featured, status, published_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, language=excluded.language, category=excluded.category, excerpt=excluded.excerpt,
       cover_image=excluded.cover_image, cover_alt=excluded.cover_alt, body=excluded.body, author=excluded.author,
       tags=excluded.tags, featured=excluded.featured, status=excluded.status,
       published_at=excluded.published_at, updated_at=CURRENT_TIMESTAMP`,
  ).bind(
    slug, b.title, b.language || 'th', b.category || null, b.excerpt || null,
    b.cover_image || null, b.cover_alt || null, b.body || null, b.author || email,
    Array.isArray(b.tags) ? b.tags.join(',') : (b.tags || null),
    b.featured ? 1 : 0, status, published_at,
  ).run();

  return json({ ok: true, slug });
};

export const onRequestDelete = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return json({ error: 'slug required' }, 400);
  await env.DB.prepare(`DELETE FROM blog_posts WHERE slug = ?`).bind(slug).run();
  await env.DB.prepare(`DELETE FROM blog_ratings WHERE slug = ?`).bind(slug).run();
  return json({ ok: true });
};
