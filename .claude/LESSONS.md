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

<!-- Append new lessons below. Format:

## LESSON [N] — [title]
**Date**: [date]
**Trigger**: [what went wrong]
**Fix**: [correct approach]
**Rule**: [one-sentence command]

-->
