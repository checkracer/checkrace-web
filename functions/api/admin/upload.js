// POST /api/admin/upload — image upload to R2 (admin only, behind Cloudflare Access).
// multipart/form-data field "file". Returns { url: "/img/<key>" }.
import { json, adminEmail } from '../_util.js';

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const onRequestPost = async ({ request, env }) => {
  if (!adminEmail(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.R2) return json({ error: 'R2 not configured' }, 500);

  let form;
  try { form = await request.formData(); } catch { return json({ error: 'invalid form data' }, 400); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'no file' }, 400);

  const ext = ALLOWED[file.type];
  if (!ext) return json({ error: 'unsupported type: ' + file.type }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'file too large (max 10MB)' }, 400);

  const key = `blog/${crypto.randomUUID()}.${ext}`;
  await env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  return json({ ok: true, url: '/img/' + key, key });
};
