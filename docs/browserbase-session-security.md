# Fambo: private Browserbase sessions (phase 1)

This change introduces **server-side primitives**, not a live login yet.

- `lib/browserbase-sessions.js`: create, inspect and close a browser with the Browserbase API. Session recordings, logging and automatic CAPTCHA solving are disabled by default in the requested browser settings. Browserbase itself still processes the interactive session.
- `lib/agent-device.js`: random per-device identifier, signed 15-minute ticket bound to that device. Cookies must be `Secure`, `HttpOnly`, `SameSite=Strict`, host-scoped.
- `lib/agent-policy.js`: browser start is disabled by default. Production must not turn this on until a **durable, atomic rate limiter**, billing caps and device-scoped session control are implemented and tested. Environment flags are a safeguard, **not a substitute** for the actual rate limiter.
- No public session creation route, no user-facing login screen, no session or viewer links sent to unrelated visitors.
- The Browserbase API key and project ID stay in Vercel sensitive environment variables and must not be sent to the browser.

## Next build gate

Implement a durable server-side, atomic reservation for session starts and limits per device and per account, ensuring repeated requests and parallel requests cannot overspend. Protect all session create/view/release operations with the signed device ticket and origin/CSRF checks. Then test the original WebUntis login and lesson extraction in the live cloud browser, with consent, before connecting it to the public wall.

No use of ChatGPT Work is required for the intended product; actual WebUntis compatibility has not yet been proven.
