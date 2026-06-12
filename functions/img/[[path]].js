// GET /img/<key> — public read of an uploaded image from R2.
export const onRequestGet = async ({ env, params }) => {
  if (!env.R2) return new Response('R2 not configured', { status: 500 });
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!key) return new Response('Not found', { status: 404 });

  const obj = await env.R2.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', obj.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
};
