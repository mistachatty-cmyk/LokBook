// Crawlable page for a published flip.
//
// LokBook is a client-rendered SPA: a crawler fetching any URL today gets an
// empty <div id="root"> and no content, so there is nothing for search engines
// to index and nothing for a link preview to show. No ad network can fix that —
// this route can.
//
// It serves real HTML with OpenGraph/Twitter tags for one post, then redirects a
// human's browser into the app. Bots get the markup; people get the app.
//
// Runs as a Vercel serverless function at /api/flip/:id, mapped to /flip/:id by
// the rewrite in vercel.json.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

async function fetchPost(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  // No `frames`. This route only ever used them to test whether frames[0] was
  // an http URL — and it never is, because frames are stored as base64 data
  // URLs. So every crawler hit was pulling an entire flip's pixel payload
  // (~16.8KB per frame, times however many frames) out of Postgres purely to
  // discard it one line later.
  const url = `${SUPABASE_URL}/rest/v1/lok_posts?id=eq.${encodeURIComponent(id)}&select=id,title,author,votes&limit=1`;
  try {
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0] || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  const id = req.query?.id || "";
  const post = await fetchPost(id);

  const site = `https://${req.headers?.host || "lokbook.app"}`;
  const title = post ? `${post.title} — by ${post.author || "an artist"} on LokBook` : "LokBook";
  const desc = post
    ? `A hand-drawn flipbook animation${post.votes ? ` with ${post.votes} votes` : ""}. Draw your own on LokBook.`
    : "A home for tiny hand-drawn animations.";
  // Frames are stored as data URLs, which are far too large for an og:image and
  // are rejected outright by many scrapers — so this always resolved to the app
  // icon anyway. Emitting it directly costs nothing and fetches nothing. When
  // posts grow a real `preview_url` column this becomes a one-line change.
  const image = `${site}/icon.svg`;
  const canonical = `${site}/flip/${encodeURIComponent(id)}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache at the edge: these pages change rarely and are mostly hit by crawlers.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(post ? 200 : 404).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="LokBook">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<script>
  // Bots read the markup above and stop. A real browser continues into the app.
  if (!/bot|crawl|spider|slurp|facebookexternalhit|embedly|preview/i.test(navigator.userAgent)) {
    location.replace("/?post=${encodeURIComponent(id)}");
  }
</script>
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#F2EDE2;color:#23306B">
  <main style="max-width:640px;margin:0 auto;padding:32px 20px">
    <h1 style="font-size:24px;margin:0 0 8px">${esc(post ? post.title : "Flip not found")}</h1>
    ${post ? `<p style="margin:0 0 16px;opacity:.75">by ${esc(post.author || "an artist")}${post.votes ? ` · ${post.votes} votes` : ""}</p>` : ""}
    <p style="opacity:.75">${esc(desc)}</p>
    <p><a href="/" style="color:#23306B;font-weight:700">Open LokBook →</a></p>
  </main>
</body>
</html>`);
}
