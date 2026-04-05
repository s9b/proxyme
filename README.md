# Proxy Me

> Hackathon: Auth0 "Authorized to Act" | Deadline: April 6, 2026 5PM PT

An agentic web app where you delegate tedious real-world tasks to an AI agent. The agent uses **Auth0 Token Vault** to hold OAuth tokens, and always fires a step-up authorization card before any irreversible action. Every step is logged to an immutable audit trail.

**Deployed URL**: _(add after deployment)_

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
| Framework | Next.js 14 App Router, TypeScript strict |
| Styling | Tailwind CSS + CSS custom properties |
| Auth | @auth0/nextjs-auth0 + @auth0/ai-vercel (Token Vault) |
| Agent | Vercel AI SDK v6 generateText with claude-sonnet-4-20250514 |
| Database | Supabase (tasks, agent_steps, pending_approvals) |
| Deployment | Vercel |

---

## Auth0 Setup

### 1. Create M2M App for Token Exchange

1. Auth0 Dashboard → Applications → Create Application → **Machine to Machine**
2. Name it `Proxy Me Token Exchange`
3. Select **Auth0 Management API** → enable: `read:users`, `read:user_idp_tokens`
4. Advanced Settings → Grant Types → enable: `client_credentials` + token-exchange URN (`urn:ietf:params:oauth:grant-type:token-exchange`)
5. Note the **Client ID** and **Client Secret** — these go into `AUTH0_CUSTOM_API_CLIENT_ID` and `AUTH0_CUSTOM_API_CLIENT_SECRET`

### 2. Set Up Google OAuth2 Connection

1. Auth0 Dashboard → Authentication → Social → Create Connection → **Google OAuth2**
2. On the Google connection settings: enable **"Store user access and refresh tokens"** (this enables Token Vault)
3. Set up Google OAuth app in Google Cloud Console with the correct redirect URI from Auth0

### 3. Configure Your Main App

1. Auth0 Dashboard → Applications → your SPA/Regular Web App
2. Advanced Settings → Grant Types → enable **Token Exchange** grant type
3. Connections → enable the Google OAuth2 connection you created

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in all values:

```bash
# Auth0
AUTH0_SECRET=                        # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=                     # SPA app client ID
AUTH0_CLIENT_SECRET=                 # SPA app client secret
AUTH0_DOMAIN=YOUR_DOMAIN.auth0.com
AUTH0_AUDIENCE=https://YOUR_API_IDENTIFIER

# Auth0 M2M (token exchange)
AUTH0_CUSTOM_API_CLIENT_ID=          # M2M app client ID
AUTH0_CUSTOM_API_CLIENT_SECRET=      # M2M app client secret
GOOGLE_CONNECTION_NAME=google-oauth2

# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 5. Supabase Schema

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

The demo flow uses a mock Jio broadband scenario:

1. User submits: _"My Jio broadband expires next month. Find something faster and cheaper. Ask before switching."_
2. Agent searches Gmail for billing emails → finds Jio 100Mbps @ ₹999/mo
3. Agent searches web for broadband plans → finds ACT 300Mbps @ ₹699/mo
4. **StepUpCard fires** — shows WHAT, WHY, IMPACT, ALTERNATIVES
5. User taps **Authorize Action**
6. Agent initiates signup + cancellation (mocked for demo)
7. Task completes with `{ savings: 3600, new_plan: "ACT 300Mbps" }`

To run a pre-seeded demo (bypasses real Gmail): POST `/api/demo` after logging in.

---

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # npx tsc --noEmit
```
