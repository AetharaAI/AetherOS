# AetherOS Web Frontend

AetherOS Web is the frontend chat interface for the Aether ecosystem.

This project is intentionally frontend-only. It is designed to connect to OpenAI-compatible model endpoints routed through LiteLLM.

## Scope

- Frontend chat UI (React + Vite + TypeScript)
- Passport IAM (OIDC) sign-in/out flow
- Control Plane UI (Context, Activity, Terminal, Browser, Files)
- LiteLLM-compatible API integration

Not included in this repo:

- Core backend orchestration services
- Model hosting infrastructure
- Database migrations / backend APIs beyond what the frontend consumes

## Requirements

- Node.js 20+
- npm 10+
- Reachable LiteLLM/OpenAI-compatible endpoint

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

App runs on `http://localhost:5173` by default.

## Environment Variables

Use `.env.example` as the source of truth.

### LiteLLM / Model Routing

- `VITE_LITELLM_API_BASE_URL`
- `VITE_LITELLM_API_KEY`
- `VITE_LITELLM_MODEL_NAME`
- `VITE_AETHEROS_APP_ID`

### Passport IAM (OIDC)

- `VITE_PASSPORT_ISSUER_URL`
- `VITE_PASSPORT_CLIENT_ID`
- `VITE_PASSPORT_REDIRECT_URI`
- `VITE_PASSPORT_POST_LOGOUT_REDIRECT_URI`
- `VITE_PASSPORT_SCOPES` (optional)
- `VITE_AETHEROS_HOME_URL` (optional)
- `VITE_PASSPORT_CLIENT_SECRET` (optional, not recommended for browser SPAs)

Compatibility alias is supported in code for older typoed config:

- `VITE_PASSPORT_CLINET_ID`

## OpenAI-Compatible Backend Expectations

To run a usable chat interface, backend should expose:

Required:

- `POST /chat/completions`
- `GET /models`

Optional but used by Context telemetry panel:

- `GET /usage`
- `GET /user/info`
- `GET /users`

## OIDC Routes Used by Frontend

- `/auth/callback` (completes Passport login)
- `/logout` (Aether Identity Hub logout landing page)

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run preview  # preview built app
npm run lint     # eslint
```

## Deploying to Vercel

This frontend is Vercel-ready.

If deploying from a repo where this app is in a subfolder:

- Set **Root Directory** to `app`
- Build Command: `npm run build`
- Output Directory: `dist`

Set all required `VITE_*` environment variables in Vercel Project Settings.

This repo includes `vercel.json` with SPA rewrites for:

- `/auth/callback`
- `/logout`
- extensionless frontend routes

So direct refresh/navigation on auth routes resolves to `index.html` correctly.

## Current State

- Frontend chat works with OpenAI-compatible LiteLLM routing
- Passport OIDC flow is wired for frontend login/logout redirect handling
- Backend-side auth, policy, and telemetry behavior can evolve without blocking frontend deployment

## License

This software is proprietary and not open source.

See `../LICENSE` for full terms.
