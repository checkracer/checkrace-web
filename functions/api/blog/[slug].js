// GET /api/blog/:slug — public single published post (with body) + rating aggregate.
import { json, splitTags, round1, voterKey } from '../_util.js';

export const onRequestGet = async ({ request, env, params }) => {
  if (!env.DB) return json({ error: 'DB not bound' }, 500);
  const slug = params.slug;

  let post;
  try {
    post = await env.DB
      .prepare(`SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'`)
      .bind(slug).first();
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
  if (!post) return json({ error: 'Not found' }, 404);

  const agg = await env.DB
    .prepare(`SELECT COUNT(*) AS c, AVG(rating) AS a FROM blog_ratings WHERE slug = ?`)
    .bind(slug).first();

  const voter = await voterKey(request);
  const mine = await env.DB
    .prepare(`SELECT rating FROM blog_ratings WHERE slug = ? AND voter = ?`)
    .bind(slug, voter).first();

  // Best-effort view counter
  try { await env.DB.prepare(`UPDATE blog_posts SET views = views + 1 WHERE slug = ?`).bind(slug).run(); } catch {}

  return json({
    post: { ...post, featured: post.featured === 1, tags: splitTags(post.tags) },
    rating: { count: agg?.c || 0, avg: round1(agg?.a), mine: mine?.rating || 0 },
  });
};
