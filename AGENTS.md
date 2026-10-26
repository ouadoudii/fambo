# Fambo – Agent instructions

## Product
Fambo is a mobile-first family dashboard combining private Google Calendar data, family timetables from WebUntis, and a readable wall-tablet view. Prioritize a clear calendar connection flow and privacy between independent users.

## Actual architecture (verify before changes)
- Vanilla JavaScript ES modules and static UI in `index.html`, `app.js`, `calendar.js`, `auth.js`.
- Node API handlers in `api/`; Cloudflare Worker in `cloudflare/worker.js`; static assets are synchronized by `scripts/build.js`.
- `calendar.js` currently uses Google Identity Services token client, with read-only Google Calendar API requests and an access token kept in page memory. This is **not** server-side OAuth and does not provide persistent sync. Do not describe it as such.
- Supabase Auth support exists in `auth.js`, but inspect actual user experience, RLS migrations, and production configuration before depending on authenticated sessions.
- Browserbase/Cloudflare WebUntis agents may have provider limitations and unsupported layouts. Prefer supported, consent-based integrations; never collect passwords.

## Development discipline
1. Check current `main`, open PRs/issues, and CI before starting work.
2. Work on one bounded feature/fix branch and open a PR. Never push untested application changes to `main`.
3. Reproduce bugs; add or improve meaningful regression coverage, including mobile and desktop browser flows for UI changes.
4. Run the project quality gate: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run audit`, `npm run build`, Cloudflare dry run, `python tests/browser.py`, and `python tests/production_smoke.py` where environments permit. Do not silently skip or weaken tests.
5. Merge only when the entire relevant gate passes; production deploy only after successful tests. Verify live functionality after deployment.
6. Check whether existing PRs touch the same subsystem; avoid conflicting parallel implementations.

## Privacy and security
- No secrets or passwords in Git or browser bundles. Ignore `.env*` except an example containing placeholders only.
- Never expose one user's calendars to others. Google scopes should be as narrow as practical, and token/callback failures handled safely.
- Server-side persistence of Google tokens requires verified per-user identity, encryption, revocation, refresh token rotation support, secure OAuth callback state/PKCE, and isolation tests.
- The current in-memory read-only browser OAuth flow is an interim implementation; do not imply a server-side credential system exists.
- Do not log private event content, access tokens, browser session URLs, or passwords.

## Priority roadmap
1. Verify current private Google Calendar connection and configuration in the actual deployment. Add explicit calendar selection and resilient expired-session/error behavior.
2. Design and implement per-user server-side OAuth/persistent sync only after auth and tenancy isolation are verifiably sound.
3. Improve WebUntis extraction and fallback paths with representative data and regression tests.
4. Optimize responsive wall-tablet/mobile UI, then Outlook integration.

## Reporting
Provide links to PR, quality-gate run, and verified live URL when available. Report exactly which checks passed, which remain unverified, and any one necessary manual external service action. Never invent readiness or production success.
