# LokBook 🖋

**▶ Play it now: https://lok-book.vercel.app**

A pocket social network for tiny hand-drawn flipbook animations. Draw a few pages, publish, and slide down anyone's post to play it. Built with React + Vite, backed by Supabase (LokServices).

---

## Quick start for party guests 🎉

1. **Open https://lok-book.vercel.app on your phone** (works best there — you can install it: You tab → ⚙ → *Add to home screen*).
2. Tap through the 30-second intro. You start with **50 Loks**.
3. **Make it yours**: You tab → ⚙ → **💾 Lok account** — pick a handle + a PIN (4+ digits). Your Loks, streak, LilLok and progress back up automatically, and your handle becomes your artist name. Log in from any device to pick up where you left off.

### What to do

| Tab | What it is |
|---|---|
| **Feed** | The shared party feed. Everyone's flips land here within ~45s of publishing. Slide a post down to play it, ▲ to vote, tap an artist's name to visit their page, **Lok** to follow them. |
| **Studio** | Draw → **Capture page** → repeat. 2+ pages makes it move. Name it, hit **Publish** — the whole room sees it. |
| **Battle** | Same prompt, same clock, vs. rival bots with real personalities and adaptive difficulty. Tap **LOK BLOCK!** when they attack your canvas. |
| **Rush** | Trace the ghost shape before the clock dies. Accuracy + speed = score. |
| **You** | Your gallery, quests, level, bookmarks, settings, and account. |
| **Shop** | Spend Loks on themes, effects, brushes, layers. No real money (except the optional LokPass). |

And meet **Blot** 🫧 — the little ink creature in the corner. It talks, it remembers, it runs out of ink if you ignore it. Feed it. It helps you in battles.

---

## The `.lok` file format 📦

LokBook flips can be exported as **`.lok`** — an open, self-contained animation format built for this app and open-sourced for anyone to use.

- **Opens anywhere.** A `.lok` file is a real ZIP archive: any OS, any zip tool, any archive browser reads it, no special software required. Inside is a plain `preview.png` (any image viewer renders it) and a human-readable `manifest.json` — even a tool with zero knowledge of the format gets something useful.
- **Small.** For apps that do implement the format, `data.lokflip` stores the animation as a shared palette + frame-to-frame deltas, then one compression pass — typically **~10× smaller** than a naive PNG-per-frame stack.
- **Open source.** Full spec + reference implementation: [`docs/LOK_FORMAT.md`](docs/LOK_FORMAT.md) in this repo, and standalone at the dedicated `lok-format` project (spec, tutorial, reference JS encoder/decoder — MIT-licensed, "LokFlip"/`.lok` name and format ownership held by LokServices).
- **Reference implementation:** [`src/engine/lokFormat.js`](src/engine/lokFormat.js) — `encodeLok(frames, meta)` / `decodeLok(blob)`.

---

## Running it yourself

```bash
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
```

Deploys to Vercel (`npx vercel deploy --prod`). No env vars needed for the alpha — the Supabase publishable key lives in `src/constants.jsx`.

## Architecture

```
src/
  main.jsx          entry
  App.jsx           all screens: Feed, Studio, Battle, Rush, Shop, Profile, Viewer
  constants.jsx     game data + Lok party API (accounts, shared feed) on Supabase REST
  engine/
    draw.jsx        canvas renderers: paper, seed animations (7 styles), avatars, tracing
    bots.js         LokMind — battle/rush bot AI: personalities, skill curves,
                    taste-based judging, rubber-band difficulty
    lillok.js       Blot Brain — phase model + context/stat-aware dialogue with memory
    lokFormat.js    .lok (LokFlip) encoder/decoder — see docs/LOK_FORMAT.md
  theme/theme.js    UI themes
  pages/            canonical split-out screens (adopted incrementally — see docs/MASTERPLAN.md D6)
```

**Backend (Supabase project "LokServices")**
- `lok_accounts` — handle + SHA-256 PIN hash + cloud save blob
- `lok_posts` — the shared party feed (JPEG-compressed frames)
- `founder_signups` — founder program

> ⚠️ Alpha note: RLS policies are intentionally open for the party build. Tighten (real auth, owner-scoped writes) before any public beta.

## Status

Alpha v1.3 — party launch build (July 2026). See `ALPHA_V1.2_CHANGELOG.md` and `lok_audit_report.md` for history.
