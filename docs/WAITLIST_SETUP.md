# Waitlist setup

`api/waitlist.js` writes every signup to **two destinations in parallel** and only
reports failure if *both* fail. Either can be configured on its own; with neither
configured the endpoint returns `503 not_configured` and the dialog says the
waitlist isn't switched on yet — deliberately, so a signup is never accepted
into nowhere.

All of these are **server-side** env vars. Set them in
**Vercel → your project → Settings → Environment Variables**. Never put them in
the client bundle (nothing prefixed `VITE_`), and never commit them.

---

## Destination 1 — email notice (Resend)

Signups arrive in your inbox. Free tier is 3,000 emails/month.

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | from https://resend.com → API Keys |
| `WAITLIST_NOTIFY_EMAIL` | where the "someone joined" mail goes |
| `RESEND_FROM` | *optional.* e.g. `LokBook <hello@yourdomain.com>` |

Leave `RESEND_FROM` unset and it uses Resend's sandbox sender, which **only
delivers to the Resend account's own address** until you verify a domain. Fine
for testing; verify a domain before launch.

## Destination 2 — Google Sheet

The durable list. Email is a notification; the sheet is the record.

**The sheet already exists:**

- **Name:** LokBook Waitlist 2026-08-18
- **ID:** `1zgzDD9Ma2Xe35A-P02CdfMZpzgHz022JeH8trDPJu_0`
- **URL:** https://docs.google.com/spreadsheets/d/1zgzDD9Ma2Xe35A-P02CdfMZpzgHz022JeH8trDPJu_0/edit
- **Columns:** `When (UTC)` · `Email` · `Phone` · `Source`

| Variable | Value |
|---|---|
| `GOOGLE_SHEET_ID` | `1zgzDD9Ma2Xe35A-P02CdfMZpzgHz022JeH8trDPJu_0` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `…@….iam.gserviceaccount.com` (below) |
| `GOOGLE_PRIVATE_KEY` | the service account's private key |
| `GOOGLE_SHEET_RANGE` | *optional*, defaults to `Sheet1!A:D` — **see the tab-name note** |

### Creating the service account

1. https://console.cloud.google.com → create or pick a project.
2. **APIs & Services → Library → Google Sheets API → Enable.**
3. **IAM & Admin → Service Accounts → Create service account.** No roles needed —
   access is granted by sharing the sheet, not by IAM.
4. On the new account: **Keys → Add key → Create new key → JSON.** Download it.
5. From that JSON, copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and
   `private_key` → `GOOGLE_PRIVATE_KEY`.
6. **Open the sheet → Share → paste the service account email → Editor.**
   Skipping this is the usual cause of a silent `403` on append.

### `GOOGLE_PRIVATE_KEY` formatting

The JSON holds the key with literal `\n` escape sequences. Paste it into Vercel
**exactly as it appears in the JSON**, `\n` sequences and all — `api/waitlist.js`
un-escapes them at runtime (`rawKey.replace(/\\n/g, "\n")`). Do not convert them
to real newlines yourself; Vercel's editor will mangle a multi-line value.

### Tab-name note — check this once

The default range is `Sheet1!A:D`. Google names the tab of a **CSV-imported**
spreadsheet after the file, not `Sheet1`, and this sheet was created that way.

So open the sheet and look at the tab at the bottom. Then either:

- **rename the tab to `Sheet1`** and leave `GOOGLE_SHEET_RANGE` unset, or
- set `GOOGLE_SHEET_RANGE` to the real name, e.g.
  `LokBook Waitlist 2026-08-18!A:D` (the code URL-encodes it, so spaces are fine).

Getting this wrong makes appends fail while the email notice still works — which
looks like everything is fine, because you still get the mail.

---

## Verifying it actually works

`npm run verify:waitlist` proves the **app** side: the button is reachable, the
POST carries the address that was typed, a 200 confirms, and a 502 does *not*
falsely claim success. It stubs the endpoint, so it says nothing about whether
your credentials work.

For the **delivery** side, after setting the vars and deploying:

```
curl -X POST https://<your-deployment>/api/waitlist \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","source":"manual-test"}'
```

- `{"ok":true,"notified":true,"recorded":true}` — both destinations working.
- `notified:false` or `recorded:false` — that one is misconfigured. Check the
  Vercel function logs; `api/waitlist.js` logs the upstream status for both.
- `503 not_configured` — neither set of vars is present in that environment.
  Check you set them for **Production**, not only Preview.

Delete the test row afterwards.

---

## Why not Composio

Composio can broker Google access, but it isn't needed here: `api/waitlist.js`
talks to the Sheets API directly with a service-account JWT — two HTTP calls,
no SDK, no third-party broker holding a token to your Drive. Fewer moving parts
and one less service that can expire, rate-limit, or change terms.

It also cannot be installed from a Claude Code remote session: the container is
ephemeral (anything installed vanishes with it), its installer resolves releases
through `api.github.com`, which the session proxy scopes to this repo, and
`composio login` needs an interactive browser OAuth flow that a non-interactive
session cannot complete. If you want it on your own machine later, nothing here
blocks that — but this endpoint won't need it.
