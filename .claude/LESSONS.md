# LESSONS.md — Proxy Me
> Auto-maintained by Claude Code. Never delete entries. Only append.
> Read this fully at session start before touching any code.

---

## LESSON 1 — Token Vault requires M2M client, not SPA client
**Date**: project start
**Trigger**: Token exchange fails if you use the SPA app client credentials for the exchange operation
**Fix**: Create a separate Machine-to-Machine app in Auth0 Dashboard. Enable read:users + read:user_idp_tokens. Use its CLIENT_ID/SECRET as AUTH0_CUSTOM_API_CLIENT_ID/SECRET
**Rule**: Never use SPA client credentials for token exchange — always use the dedicated M2M client

---

## LESSON 2 — Deep package imports blocked by bundler module resolution
**Date**: 2026-04-05
**Trigger**: `import type { ToolWrapper } from '@auth0/ai-vercel/dist/esm/util/ToolWrapper'` threw TS2307 because the package.json `exports` map only exposes `.`, `./interrupts`, and `./react` — the util subpath is not listed
**Fix**: Define the type locally inline instead of importing from a deep path not listed in the package `exports`
**Rule**: Only import from subpaths listed in a package's `exports` field; define missing types locally

---

## LESSON 3 — Auth0 Token Vault requires Auth0 Pro (token-exchange grant)
**Date**: 2026-04-05
**Trigger**: Auth0 free plan does not support the token-exchange grant type required by @auth0/ai-vercel Token Vault
**Fix**: Replaced Token Vault with a Supabase `user_tokens` table (AES-256-GCM encrypted). Kept `withGmailConnection`/`withGmailWriteConnection` as passthrough wrappers with identical interface so upgrading to real Token Vault is a one-file change in `lib/auth0-ai.ts`
**Rule**: When mocking Token Vault, mirror its wrapper interface exactly (same function names, same generic passthrough) so the production upgrade path requires only one file change

---

<!-- Append new lessons below. Format:

## LESSON [N] — [title]
**Date**: [date]
**Trigger**: [what went wrong]
**Fix**: [correct approach]
**Rule**: [one-sentence command]

-->
