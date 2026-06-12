// Shared helpers for Checkrace blog Functions (underscore = not a route)

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export function splitTags(s) {
  return String(s || '').split(',').map((t) => t.trim()).filter(Boolean);
}

export function round1(n) {
  return n ? Math.round(Number(n) * 10) / 10 : 0;
}

// Anonymous, stable per-visitor key (salted hash of IP + User-Agent).
export async function voterKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const ua = request.headers.get('user-agent') || '';
  const raw = `checkrace-blog-v1|${ip}|${ua}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Cloudflare Access gate: the Access policy on /admin/* and /api/admin/* injects
// this header. Returns the email if authorized, else null. Optional ADMIN_EMAILS
// env var (comma-separated) narrows it further.
export function adminEmail(request, env) {
  const email = (request.headers.get('cf-access-authenticated-user-email') || '').toLowerCase();
  if (!email) return null;
  const allow = String(env.ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(email)) return null;
  return email;
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase().trim()
    .replace(/[^\w\u0E00-\u0E7F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
