# Proxy Me


An agentic web app where you delegate tedious real-world tasks to an AI agent. The agent always fires a **step-up authorization card** before any irreversible action. Every step is logged to an immutable audit trail.

**Deployed URL**: https://proxyme-nine.vercel.app

---

## What It Does

1. You type a task: _"My Jio broadband expires next month. Find something faster and cheaper. Ask before switching."_
2. The agent researches using your Gmail and the web
3. Before switching anything, it shows a **StepUpCard** — what, why, impact, alternatives
4. You approve or reject. If rejected, the agent reconsiders
5. On approval, it initiates the switch and logs everything

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, TypeScript strict |
| Styling | Tailwind CSS + CSS custom properties |
| Auth | @auth0/nextjs-auth0 |
| Agent | Vercel AI SDK v6 + Groq (`moonshotai/kimi-k2-instruct`) |
| OAuth tokens | Supabase `user_tokens` (encrypted) → Auth0 Token Vault in production |
| Database | Supabase (tasks, agent_steps, pending_approvals, user_tokens) |
| Deployment | Vercel |

---

## Auth0 Token Vault — Production vs Demo

### This demo

OAuth tokens (Google/Gmail) are stored **encrypted in Supabase** (`user_tokens` table) using AES-256-GCM. The custom Google OAuth flow lives at `/api/auth/google/start` → `/api/auth/google/callback`.

The `withGmailConnection` / `withGmailWriteConnection` wrappers in `lib/auth0-ai.ts` are **passthrough** — the same interface as Token Vault, so upgrading is a one-file swap.

### With Auth0 Pro (production)

Replace `lib/auth0-ai.ts` with:

```typescript
import { Auth0AI, getAccessTokenFromTokenVault } from '@auth0/ai-vercel';
import { getRefreshToken } from './auth0';

const auth0AI = new Auth0AI();
export const withGmailConnection = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  refreshToken: getRefreshToken,
});
export const withGmailWriteConnection = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  refreshToken: getRefreshToken,
});
export const getAccessToken = () => getAccessTokenFromTokenVault();
```

Token Vault handles storage, refresh, and rotation automatically — no `user_tokens` table needed.

**Auth0 Pro setup** (when upgrading):
1. Dashboard → Applications → Create M2M app → select Auth0 Management API → enable `read:users`, `read:user_idp_tokens`
2. Grant Types → enable `client_credentials` + `urn:ietf:params:oauth:grant-type:token-exchange`
3. Authentication → Social → Google OAuth2 → enable **"Store user access and refresh tokens"**
4. Main app → Advanced Settings → Grant Types → enable Token Exchange

---

## Setup

### 1. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in all values. Key ones:

```bash
# Auth0 (user authentication)
AUTH0_SECRET=                        # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_DOMAIN=YOUR_DOMAIN.auth0.com

# Google OAuth2 (Gmail access)
# Create at: https://console.cloud.google.com/apis/credentials
# Redirect URI: http://localhost:3000/api/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Token encryption
TOKEN_ENCRYPTION_KEY=               # openssl rand -hex 32

# Groq
GROQ_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 2. Auth0 Setup

1. Create an **Auth0 application** (Regular Web Application)
2. Add `http://localhost:3000/auth/callback` to Allowed Callback URLs
3. Add `http://localhost:3000` to Allowed Logout URLs

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID → Web Application
3. Add `http://localhost:3000/api/auth/google/callback` as authorized redirect URI
4. Enable Gmail API for your project

### 4. Supabase Schema

Run `lib/supabase/schema.sql` in your Supabase SQL editor.

---

## Local Development

```bash
npm install
cp .env.local.example .env.local
# fill in all env vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Scenario

1. Sign in → Onboarding → Connect Gmail (Google OAuth consent screen)
2. Return to dashboard → Submit: _"My Jio broadband expires next month. Find something faster and cheaper. Ask before switching."_
3. Agent searches Gmail → finds Jio billing email
4. Agent searches web → finds cheaper plan (ACT 300Mbps @ ₹699/mo)
5. **StepUpCard fires** — WHAT / WHY / IMPACT / ALTERNATIVES
6. Tap **Authorize Action** → agent proceeds (mocked signup + cancellation)
7. Task completes with `{ savings: 3600, new_plan: "ACT 300Mbps" }`

To run a pre-seeded demo (no real Gmail needed): POST `/api/demo` after logging in.

---

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
```
