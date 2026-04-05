# CLAUDE.md — Proxy Me
> Hackathon: Auth0 "Authorized to Act" | Deadline: April 6, 2026 5PM PT

## What This Is
Proxy Me is an agentic web app where users delegate tedious real-world tasks (broadband switching, bill disputes, insurance comparison) to an AI agent. The agent uses **Auth0 Token Vault** — the real SDK, not mocked — to hold OAuth tokens. Before any irreversible action, it fires a step-up auth card and waits for user approval. Everything is logged to an immutable audit trail.

Token Vault is not plumbing. It IS the product.

---

## Quick Commands
```bash
npm run dev           # localhost:3000
npm run build         # must pass before done
npm run lint          # ESLint
npm run type-check    # npx tsc --noEmit
```

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| Styling | Tailwind CSS — no UI libraries |
| Auth | @auth0/nextjs-auth0 + @auth0/ai-vercel (Token Vault) |
| Agent | Vercel AI SDK streamText with claude-sonnet-4-20250514 |
| Database | Supabase (tasks, agent_steps, pending_approvals) |
| Deployment | Vercel |

---

## Auth0 SDK — Exact Implementation

### Packages
```bash
npm install @auth0/nextjs-auth0
npm install @auth0/ai-vercel
npm install @auth0/ai-components
```

### How Token Vault Works
Token Vault uses an interrupt pattern — not a custom signal.
When a tool wrapped with withTokenForConnection() is called:
1. Auth0 SDK tries to get a token for the connection
2. If no token / expired / missing scopes → throws TokenVaultInterrupt
3. Interrupt bubbles up through streamText
4. Frontend catches it and shows consent UI
5. After user grants → execution resumes

### lib/auth0.ts
```typescript
import { Auth0Client } from '@auth0/nextjs-auth0/server';
export const auth0 = new Auth0Client();
export const getRefreshToken = async () => {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken;
};
```

### lib/auth0-ai.ts
```typescript
import { Auth0AI, getAccessTokenForConnection } from '@auth0/ai-vercel';
import { getRefreshToken } from './auth0';

export const getAccessToken = async () => getAccessTokenForConnection();
const auth0AI = new Auth0AI();

export const withGmailConnection = auth0AI.withTokenForConnection({
  connection: 'google-oauth2',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  refreshToken: getRefreshToken,
});

export const withGmailWriteConnection = auth0AI.withTokenForConnection({
  connection: 'google-oauth2',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
  refreshToken: getRefreshToken,
});
```

### Tool wrapping pattern
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { withGmailConnection, getAccessToken } from '../auth0-ai';

export const searchGmail = withGmailConnection(
  tool({
    description: 'Search Gmail for messages',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const accessToken = await getAccessToken();
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return res.json();
    },
  })
);
```

### Auth0 Dashboard Setup (also document in README)
1. Applications → Create Application → Machine to Machine → name "Proxy Me Token Exchange"
2. Select Auth0 Management API → enable: read:users, read:user_idp_tokens
3. Advanced Settings → Grant Types → enable: client_credentials + token-exchange URN
4. Authentication → Social → Create Connection → Google OAuth2
5. On Google connection: enable "Store user access and refresh tokens" (Token Vault)
6. Enable Token Vault grant type on your main SPA app too

### Environment Variables
```bash
# Auth0
AUTH0_SECRET=                        # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_DOMAIN=YOUR_DOMAIN.auth0.com
AUTH0_AUDIENCE=https://YOUR_API_IDENTIFIER
AUTH0_CUSTOM_API_CLIENT_ID=          # M2M client from step 1
AUTH0_CUSTOM_API_CLIENT_SECRET=
GOOGLE_CONNECTION_NAME=google-oauth2

# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Folder Structure
```
proxyme/
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   ├── LESSONS.md
│   └── commands/
│       ├── build-check.md
│       └── deploy.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── middleware.ts
│   ├── dashboard/page.tsx
│   ├── task/[id]/page.tsx
│   ├── onboarding/page.tsx
│   └── api/
│       ├── auth/[auth0]/route.ts
│       ├── agent/route.ts
│       ├── tasks/route.ts
│       └── approve/route.ts
├── components/
│   ├── TaskInput.tsx
│   ├── AgentFeed.tsx
│   ├── StepUpCard.tsx
│   └── AuditLog.tsx
├── lib/
│   ├── auth0.ts
│   ├── auth0-ai.ts
│   ├── agent/
│   │   ├── tools.ts
│   │   ├── executor.ts
│   │   └── prompts.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── schema.sql
│   └── types.ts
└── .env.local
```

---

## Database Schema
```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  description text not null,
  status text not null default 'pending',
  messages jsonb,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table agent_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  step_type text not null,
  description text not null,
  metadata jsonb default '{}',
  status text not null default 'complete',
  created_at timestamptz default now()
);

create table pending_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  action_summary text not null,
  action_reasoning text not null,
  action_impact text not null,
  alternatives_considered text,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table tasks enable row level security;
alter table agent_steps enable row level security;
alter table pending_approvals enable row level security;
```

---

## Agent Tools (lib/agent/tools.ts)

### Read Tools — no approval needed
- `searchGmail(query)` — withGmailConnection
- `readGmailThread(threadId)` — withGmailConnection
- `searchWeb(query)` — plain tool
- `fetchUrl(url)` — plain tool

### Write Tools — ALL need requestApproval first
- `sendEmail(to, subject, body)` — withGmailWriteConnection
- `initiateCancellation(serviceId, reason)` — mocked for demo
- `initiateSignup(serviceId, planId)` — mocked for demo

### Control Tools
- `logStep(step_type, description, metadata?)` — writes to agent_steps
- `taskComplete(result)` — final step
- `taskFailed(reason)` — error step
- `requestApproval(params)` — THE critical tool, see below

### requestApproval — Critical Implementation
```typescript
export const requestApproval = tool({
  description: 'MANDATORY before ANY write/cancel/submit/purchase. Pauses execution.',
  parameters: z.object({
    action_summary: z.string(),
    action_reasoning: z.string(),
    action_impact: z.string(),
    alternatives_considered: z.string(),
  }),
  execute: async ({ action_summary, action_reasoning, action_impact, alternatives_considered }, { taskId }) => {
    const { data } = await supabase.from('pending_approvals').insert({
      task_id: taskId,
      action_summary,
      action_reasoning,
      action_impact,
      alternatives_considered,
      status: 'pending',
    }).select().single();

    await supabase.from('tasks')
      .update({ status: 'awaiting_approval' })
      .eq('id', taskId);

    return { __type: 'APPROVAL_REQUIRED', approvalId: data.id };
  },
});
```

Executor checks every tool result for `__type === 'APPROVAL_REQUIRED'`. On match: save messages to Supabase `tasks.messages` column, halt. Resume: `/api/approve` reloads messages, re-runs executor from saved state.

---

## Design System

**Aesthetic**: Dark, clinical, trust-inspiring. Private bank meets Bloomberg terminal.

### CSS Variables
```css
:root {
  --bg-primary: #0a0a0b;
  --bg-secondary: #111113;
  --bg-elevated: #18181c;
  --border: #2a2a30;
  --border-subtle: #1e1e24;
  --text-primary: #e8e8ed;
  --text-secondary: #8888a0;
  --text-muted: #55556a;
  --accent: #00d4aa;
  --accent-dim: rgba(0, 212, 170, 0.08);
  --danger: #ff4444;
  --danger-dim: rgba(255, 68, 68, 0.08);
  --warning: #ffaa00;
}
```

### Fonts
- **Syne** — headings
- **DM Sans** — body
- **DM Mono** — agent log feed ONLY
- **NEVER**: Inter, Roboto, Arial, Space Grotesk

### Rules
- `border-radius: 2px` everywhere — sharp corners
- No drop shadows — use borders
- No glassmorphism except StepUpCard backdrop
- No purple gradients

---

## StepUpCard — The Hero Component

Full-screen overlay. Feels like signing a legal document.

```
┌─────────────────────────────────────────┐
│ [4px teal top border]                    │
│                                          │
│  ⚠ ACTION REQUIRED                       │
│                                          │
│  WHAT                                    │
│  One-sentence action description         │
│                                          │
│  WHY                                     │
│  Agent's reasoning (2-3 sentences)       │
│                                          │
│  IMPACT                                  │
│  Saves ₹8,400/yr · Old plan cancelled   │
│                                          │
│  ALTERNATIVES CONSIDERED                 │
│  What else was evaluated                 │
│                                          │
│  [Authorize Action]    [Stop & Ask]      │
│   teal bg               red border       │
└─────────────────────────────────────────┘
```

- Max width 520px, centered
- Backdrop: blur(8px) dark overlay
- Animate: opacity 0→1, scale 0.97→1, 200ms
- REJECT shows reason input before submitting

---

## AgentFeed Component

```
● RESEARCHING   (teal pulsing dot = active)
  ├ Reading Gmail billing emails...
  ├ Found Jio 100Mbps @ ₹999/mo
  └ Searching competitors in Bangalore...

✓ ANALYZING   (muted dot = done)
  ├ Compared 8 plans
  └ ACT 300Mbps @ ₹699/mo is best

● PREPARING ACTION
  └ Requesting your approval...
```

- Phase headers: Syne font
- Step text: DM Mono, var(--text-secondary)
- Key figures highlighted in var(--accent)
- Supabase realtime subscription

---

## Demo Scenario

**Task**: "My Jio broadband expires next month. Find something faster and cheaper. Ask before switching."

**Flow**:
1. searchGmail → finds billing email
2. logStep(research, "Found Jio 100Mbps @ ₹999/mo, expires May 3")
3. searchWeb → finds ACT, Airtel, BSNL plans
4. logStep(compare, "ACT 300Mbps @ ₹699/mo best value")
5. requestApproval → StepUpCard fires
6. User taps APPROVE
7. initiateSignup (mocked) + initiateCancellation (mocked)
8. taskComplete({ savings: 3600 })

---

## Code Standards

- TypeScript strict — zero `any`, use `unknown` + narrow
- No `console.log` — use `logStep` or structured errors
- All API routes validate auth session first
- Supabase writes use `SUPABASE_SERVICE_ROLE_KEY` server-side only
- Components max 150 lines
- Every async function has try/catch

---

## Self-Improvement Loop

**This rule is always active.**

Whenever you fix a bug, correct a wrong assumption, or get corrected by the user — immediately after fixing it, append a new lesson to `.claude/LESSONS.md`:

```markdown
## LESSON [N] — [short title]
**Date**: [date or "unknown"]
**Trigger**: [what went wrong / what assumption was incorrect]
**Fix**: [the correct approach]
**Rule**: [one-sentence command — "Always..." / "Never..." / "When X, do Y"]
```

**Rules**:
- Be specific, not vague
- Never delete old lessons — only append
- If a lesson contradicts an older one, note it in the new lesson

On every session start: read `.claude/LESSONS.md` fully before writing any code. These are codebase-specific rules. Treat them as hard constraints.
