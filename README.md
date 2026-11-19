# OmniMeetX

AI meeting notes for the language you actually speak. Upload or record a meeting (or paste a
YouTube link) and get a transcript, a summary, key points, decisions and action items, in
English, Urdu and 96 more languages. Billed by audio minute.

| Part | Stack |
|---|---|
| `frontend/` | Next.js 14 (App Router), TypeScript, Tailwind v4, Clerk (Google sign-in), Paddle.js, Sentry |
| `backend/` | FastAPI, SQLAlchemy, python-socketio, FFmpeg, yt-dlp, Sentry |
| Data | Supabase: Postgres (all tables, row-level security on) and Storage (recordings, avatars) |
| AI | Speech-to-text: AssemblyAI, Groq Whisper, Gemini audio (spoken language auto-detected). Notes: Gemini, falling back to Groq, Cerebras, OpenRouter |
| Services | Render (hosting), Cloudflare (DNS, CDN), Paddle (payments, Merchant of Record), Clerk (Google sign-in), Resend (email), Sentry (errors) |

## Run it locally

Needs Python 3.13, Node 22 and FFmpeg on your PATH.

```bash
# Backend  ->  http://localhost:5000   (API docs at /docs)
cd backend
cp .env.example .env          # fill in your keys
start.bat                     # Windows   (macOS/Linux: ./start.sh)

# Frontend ->  http://localhost:3000
cd frontend
cp .env.example .env.local    # fill in your public keys
npm install
npm run dev
```

No email key yet? Sign-up codes are printed in the backend terminal (development only).
Without Supabase settings the backend uses a local SQLite file (`backend/data/app.db`) and the local disk.

## How it works

```
Browser (Next.js) ──REST──▶ FastAPI ──▶ Postgres (Supabase)
       │                       └──────▶ Storage (Supabase): recordings, avatars
       └──Socket.IO──▶ live progress and room events

Upload ─▶ jobs.enqueue ─▶ processing pipeline (background thread)
          1. probe duration, reserve minutes (1 credit = 1 audio minute)
          2. transcribe    (spoken language auto-detected)
          3. translate     (if the requested language differs)
          4. clean up      (filler removal, topics)
          5. AI notes      (summary, key points, decisions, action items, sentiment)
          failure ─▶ minutes refunded. Restart mid-job ─▶ released after 5.5 min, minutes refunded.
```

## Project structure

```
backend/
├── app/
│   ├── main.py          entry point: middleware, routers, Socket.IO (socket_app), startup checks
│   ├── core/            settings (.env), security (JWT, passwords), rate limits, startup checks
│   ├── db/              engine, sessions, auto-migration (adds new model columns on start)
│   ├── models/          user, meeting, meeting_room, activity, billing (credit ledger)
│   ├── routers/         one file per API area, registered in routers/__init__.py
│   ├── services/        business logic: processing, jobs, transcription, ai, billing,
│   │                    storage + recordings (Supabase), email (Resend), cleanup (retention)
│   ├── sockets/         Socket.IO handlers
│   └── utils/
├── scripts/             one-off tools (copy SQLite data and files to Supabase)
├── tests/               pytest, throwaway database, no real services (except test_e2e.py)
└── requirements.txt     (requirements-dev.txt adds test tools)

frontend/
├── app/                 routes: (marketing) public pages, (auth) login/sign-up,
│                        (app) signed-in pages, sitemap.ts, robots.ts, opengraph-image.tsx
├── components/          ui/ (shadcn), app/, auth/, landing/, media/, motion/, brand/
├── hooks/  lib/         lib/config.ts (backend URLs), lib/site.ts (public URL, SEO pages), lib/brand.ts
└── styles/              tokens.css (all colours), glass and animation CSS

render.yaml              Render Blueprint: both services, region, plans, health checks, env var names
.github/workflows/ci.yml tests and production build on every push; Render deploys only when they pass
```

Folders starting with `_` (for example `app/(app)/_friends`, `app/_meeting`) are parked features:
not routes, not type-checked, kept for later.

## Configuration

Every setting is listed and explained in `backend/.env.example` and `frontend/.env.example`.
Secrets live only in `backend/.env` locally and in Render's Environment tab in production; both
are outside git. `NEXT_PUBLIC_*` values are public by design and are built into the website.

## Deploying (Render)

Both services run in Render's **Singapore** region, next to the Supabase database (ap-southeast-1).

1. Render → **New → Blueprint** → this repository. Render reads `render.yaml` and asks for each secret.
2. First deploy uses the `*.onrender.com` addresses. Put them in `FRONTEND_URL`, `ALLOWED_ORIGINS`,
   `BACKEND_PUBLIC_URL` (API) and `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` (website), then redeploy the website.
3. Custom domain through Cloudflare DNS:

   | Name | Type | Target | Cloudflare proxy |
   |---|---|---|---|
   | `@` | CNAME | `omnimeetx-web.onrender.com` | DNS only until Render verifies, then Proxied |
   | `www` | CNAME | `omnimeetx-web.onrender.com` | same |
   | `api` | CNAME | `omnimeetx-api.onrender.com` | **DNS only, always** (uploads are up to 200 MB; Cloudflare's free plan stops at 100 MB) |

   Cloudflare SSL/TLS mode: **Full**. Then change the URL settings above to the real domain and redeploy.
4. Paddle webhook: `https://api.<domain>/api/billing/webhook`.

A push to `main` deploys automatically once CI passes. A deploy waits up to 5 minutes for meetings
being processed to finish. If one is cut off anyway, it is marked failed after restart and its minutes
are returned.

**Health check:** `GET /api/health` (200 healthy, 503 if the database is unreachable).
**Errors:** Sentry (frontend and backend projects). **Logs and metrics:** Render dashboard.

## Conventions

- The frontend reads the backend address only from `lib/config.ts`; the public site address only from `lib/site.ts`.
- New API area: a file in `backend/app/routers/` plus one line in `routers/__init__.py`.
- Background work goes through `services/jobs.py`, the one place to swap threads for a real queue.
- Schema changes: adding a column to a model is enough (added on start). Renames, type changes and
  deletes need a proper migration (Alembic) first.
- AI model names are settings (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`), never hard-coded.
- Copy makes no claims the product can't back up (accuracy numbers, certifications, customer counts).

## License

Proprietary. All rights reserved © OmniMeetX.
