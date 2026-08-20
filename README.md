# Quantum Earth

[![CI](https://github.com/johnmatveyev-lab/quantum-earth/actions/workflows/ci.yml/badge.svg)](https://github.com/johnmatveyev-lab/quantum-earth/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/johnmatveyev-lab/quantum-earth)

**Real-time 3D aerospace intelligence and tracking platform with voice AI.**

Quantum Earth is a production-grade command center for tracking satellites, aircraft, rockets, vessels, and orbital objects on a high-fidelity interactive 3D globe. It includes layered environmental overlays, AI insights, voice copilots (LiveKit + optional xAI), geofencing, watchlists, analytics, and enterprise features.

## Live Demo

- **Production**: Check Vercel project `quantumearth-main` (or the latest deployment after this release).
- GitHub: https://github.com/johnmatveyev-lab/quantum-earth

## Screenshots

![Landing](public/screenshots/landing.png)
![App Overview](public/screenshots/app.png)
![Voice Panel](public/screenshots/voice.png)

## Highlights

- Live 3D globe (Three.js + React Three Fiber) with custom GLSL shaders
- Multi-domain tracking: aircraft (OpenSky), satellites (CelesTrak + satellite.js), SpaceX launches, Starlink, AIS vessels
- Environmental layers: night lights, infrared, vegetation, sea surface temp, clouds, aurora, orbital paths, traffic heatmaps
- AI insights panel + voice copilot (LiveKit primary, xAI realtime optional)
- Geofencing, watchlists, anomaly alerts, timeline scrubbing
- Supabase backend (Auth, Postgres, Edge Functions, Realtime)
- Stripe subscriptions (Free / Pro / Enterprise)
- Custom dashboards, data ingestion (KML/TLE/CSV/GeoJSON), developer API

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| 3D Engine | Three.js + @react-three/fiber + custom GLSL |
| State | Zustand |
| Backend | Supabase (Auth, DB, Edge Functions) |
| Voice | LiveKit (primary) + xAI realtime (optional) |
| AI | Google Gemini + Grok/xAI |
| Payments | Stripe |

## Quick Start (Local)

```bash
git clone https://github.com/johnmatveyev-lab/quantum-earth.git
cd quantum-earth
npm install
cp .env.example .env   # fill required keys
npm run dev
```

Open `http://localhost:8080` (or 8081 if port conflict).

## Environment Variables

Copy `.env.example` → `.env`. Minimum for UI:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

Voice:
- LiveKit: `VITE_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- xAI (optional): `VITE_XAI_API_KEY` or use Supabase `xai-token` function

Server-side secrets (Supabase Edge Functions / Vercel):
- `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, Gemini key, etc. — never expose in client.

## Production Deployment Checklist

### 1. GitHub
- Repo is public or private as preferred.
- CI workflow (`.github/workflows/ci.yml`) runs on push.
- Main branch protected if team access is enabled.

### 2. Vercel
- Project linked to `johnmatveyev-lab/quantum-earth`.
- Environment variables set in Vercel dashboard (Production + Preview):
  - All `VITE_*` client keys
  - Any build-time secrets
- `vercel.json` provides SPA rewrites + security headers (X-Frame-Options, nosniff, etc.).
- Deploy: push to `main` or use Vercel dashboard / CLI.

### 3. Supabase
- Project live, migrations applied.
- Edge Functions deployed (`livekit-token`, `xai-token`, proxies, AI functions, Stripe).
- Secrets configured in Supabase dashboard.
- RLS policies enabled and tested.

### 4. Third-party
- LiveKit Cloud project + keys.
- xAI API key (if using voice).
- Stripe products/prices + webhook endpoint pointing to Supabase function.
- Google Maps + Gemini keys with proper restrictions.

### 5. Security & Performance
- No secrets in client bundle or git.
- Security headers enabled via `vercel.json`.
- Assets (textures, JS) cached with long max-age.
- Error boundaries present.
- Rate limiting recommended on public Edge Functions.

## Voice Modes

- **LiveKit (default)**: Production-ready, uses Supabase `livekit-token`.
- **xAI realtime (optional)**: Uses `xai-token` for ephemeral secrets.

## Tests

```bash
npm test
# or
npx vitest run
```

## Roadmap

- Mission replay timelines with shareable links
- Expanded anomaly / collision prediction
- Deeper multi-agent orchestration (Grok as director)
- Mobile-optimized globe experience

## License

MIT

---

Built for production. Deployed via Vercel + GitHub. Powered by AI agents.
