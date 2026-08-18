/**
 * Waitlist signup — Vercel Node serverless function.
 *
 * Ported from LokLingu's api/waitlist.ts so both products capture interest the
 * same way, into the same two places, with the same env var names. Kept in
 * plain JS to match api/flip/[id].js and stay out of the Vite bundle.
 *
 * LokBook is local-first until launch: nothing a person draws is promised to
 * the cloud yet. This endpoint is the one thing that does leave the device,
 * and only when someone explicitly asks to be told when that changes.
 *
 * Two destinations, both best-effort and independently configured via env vars
 * set in the Vercel project (Settings -> Environment Variables), never
 * committed to the repo:
 *
 *   RESEND_API_KEY             - from resend.com, enables the email notice
 *   RESEND_FROM                  (optional) verified sender; defaults to
 *                                Resend's sandbox address, which only delivers
 *                                to the account's own inbox until a domain is
 *                                verified
 *   WAITLIST_NOTIFY_EMAIL        where the "someone joined" email goes
 *
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL from a Google Cloud service account
 *   GOOGLE_PRIVATE_KEY           its private key (paste with literal \n line
 *                                breaks; this file un-escapes them)
 *   GOOGLE_SHEET_ID              the spreadsheet ID from its URL, shared with
 *                                the service account email as Editor
 *   GOOGLE_SHEET_RANGE           (optional) defaults to Sheet1!A:D
 *
 * Neither integration is required for the other to work. If NEITHER is
 * configured the endpoint returns 503 rather than silently accepting a signup
 * nowhere durable records it — an accepted-but-lost email is worse than a
 * visible failure, because nobody finds out until launch day.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: accepts "+1 555-123-4567", "(555) 123 4567", etc.
// Just enough digits to be a real number, not a format validator.
const PHONE_DIGITS_RE = /\d/g;

const base64url = buf =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sendNotifyEmail(email, phone, source) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.WAITLIST_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.RESEND_FROM || "LokBook <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "New LokBook waitlist signup",
      text: `Email: ${email}\nPhone: ${phone ?? "(not provided)"}\nSource: ${source}\nWhen: ${new Date().toISOString()}`,
    }),
  });
  if (!res.ok) {
    console.error("waitlist: resend failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

async function appendToSheet(email, phone, source) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !rawKey || !sheetId) return false;
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const range = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:D";

  // Service-account OAuth2 JWT bearer flow, done by hand with Node's built-in
  // crypto instead of the googleapis SDK — that package pulls in a large
  // dependency tree for what is otherwise a two-HTTP-call flow.
  const { createSign } = await import("node:crypto");
  const header = base64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64url(Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${claims}`;
  const signature = base64url(createSign("RSA-SHA256").update(signingInput).sign(privateKey));
  const assertion = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!tokenRes.ok) {
    console.error("waitlist: google token exchange failed", tokenRes.status, await tokenRes.text().catch(() => ""));
    return false;
  }
  const { access_token: accessToken } = await tokenRes.json();
  if (!accessToken) return false;

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[new Date().toISOString(), email, phone ?? "", source]] }),
    },
  );
  if (!appendRes.ok) {
    console.error("waitlist: sheet append failed", appendRes.status, await appendRes.text().catch(() => ""));
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch { return res.status(400).json({ error: "invalid_body" }); }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  // Where in the app they joined from, so the sheet shows which surface works.
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "unknown";

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "invalid_email" });
  }
  const phoneDigits = phoneRaw.match(PHONE_DIGITS_RE)?.length ?? 0;
  if (phoneRaw && phoneDigits < 7) {
    return res.status(400).json({ error: "invalid_phone" });
  }
  const phone = phoneRaw || null;

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.WAITLIST_NOTIFY_EMAIL);
  const sheetConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID,
  );
  if (!emailConfigured && !sheetConfigured) {
    return res.status(503).json({ error: "not_configured" });
  }

  const [emailOk, sheetOk] = await Promise.all([
    emailConfigured ? sendNotifyEmail(email, phone, source) : Promise.resolve(false),
    sheetConfigured ? appendToSheet(email, phone, source) : Promise.resolve(false),
  ]);

  if (!emailOk && !sheetOk) {
    return res.status(502).json({ error: "delivery_failed" });
  }

  return res.status(200).json({ ok: true, notified: emailOk, recorded: sheetOk });
}
