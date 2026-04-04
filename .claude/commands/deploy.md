# /deploy

Final submission prep. Run after /build-check passes.

1. Confirm /build-check passed — if not, run it first
2. Confirm README.md has:
   - One paragraph describing Proxy Me
   - Auth0 Dashboard setup (6 steps from CLAUDE.md)
   - All env vars with comments
   - Local dev instructions
   - Demo scenario walkthrough
   - Deployed public URL
3. Confirm .env.local.example exists — no real secrets
4. Confirm Supabase tables exist — schema.sql matches actual DB
5. Final npm run build
6. List all env vars needed in Vercel dashboard

Output: checklist with PASS/FAIL per item.
