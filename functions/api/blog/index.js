// GET /api/blog — public list of published posts (cards, no body).
// Query: ?limit=N (default 100, max 200), ?category=xxx, ?featured=1
import { json, splitTags, round1 } from '../_util.js';

export const onRequestGet = async ({ request, env }) => {
  if (!env.DB) return json({ posts: [], error: 'DB not bound' });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 200);
  const category = url.searchParams.get('category');
  const onlyFeatured = url.searchParams.get('featured') === '1';

  let sql = `
    SELECT b.slug, b.title, b.language, b.category, b.excerpt, b.cover_image, b.cover_alt,
           b.author, b.tags, b.featured, b.published_at, b.views,
           (SELECT COUNT(*) FROM blog_ratings r WHERE r.slug = b.slug) AS rating_count,
           (SELECT AVG(rating) FROM blog_ratings r WHERE r.slug = b.slug) AS rating_avg
      FROM blog_posts b
     WHERE b.status = 'published'`;
  const binds = [];
  if (category) { sql += ` AND b.category = ?`; binds.push(category); }
  if (onlyFeatured) { sql += ` AND b.featured = 1`; }
  sql += ` ORDER BY b.featured DESC, COALESCE(b.published_at, b.created_at) DESC LIMIT ?`;
  binds.push(limit);

  try {
    const r = await env.DB.prepare(sql).bind(...binds).all();
    const posts = (r?.results || []).map((p) => ({
      ...p,
      featured: p.featured === 1,
      tags: splitTags(p.tags),
      rating_avg: round1(p.rating_avg),
      rating_count: p.rating_count || 0,
    }));
    return json({ posts });
  } catch (e) {
    return json({ posts: [], error: String(e) });
  }
};
