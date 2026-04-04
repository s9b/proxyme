# /build-check

Run a full pre-submission quality check. Fix every failure before reporting done.

1. **TypeScript**: npm run type-check — zero errors
2. **Lint**: npm run lint — zero errors
3. **Build**: npm run build — must succeed
4. **Auth0 check**: Confirm lib/auth0-ai.ts uses @auth0/ai-vercel with real Auth0AI(). Search for hardcoded tokens or mocked auth — must be zero.
5. **Step-up check**: Search for any write/cancel/submit tool that doesn't call requestApproval first. Must be zero.
6. **Audit log check**: Confirm every agent tool call writes to Supabase agent_steps via logStep.
7. **Font check**: grep -r "Inter\|Roboto" --include="*.tsx" --include="*.css" — must be zero results.
8. **Secret check**: grep -r "sk-" --include="*.ts" --include="*.tsx" — must be empty.
9. **Env example**: .env.local.example exists with all keys.
10. **README**: README.md has Auth0 6-step setup and deployed URL.

Report PASS/FAIL per check. Fix all FAILs before done.
