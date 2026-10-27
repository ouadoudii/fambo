# Codex development environment

Repository: https://github.com/ouadoudii/fambo

## Create environment

Connect this repository in Codex. Select **main** as the starting branch. Set the environment setup command to `bash scripts/codex-setup.sh`. This requires a Linux environment with Node 22, Python 3 and access to install Chromium system dependencies. The included `.devcontainer/devcontainer.json` offers a reproducible Codespaces/VS Code alternative, but does not automatically create a Codex cloud environment.

No secrets are required for offline tests or the static preview. Do **not** paste Google, Supabase, Cloudflare or WebUntis credentials into Codex chat.

## Commands

- Start preview: `npm run dev`, port **4173**.
- Syntax checks: `npm run typecheck`, `npm run lint`.
- Unit and integration: `npm test`.
- Security dependencies: `npm run audit`.
- Build: `npm run build`.
- Desktop/mobile Playwright: `.venv/bin/python tests/browser.py`.
- Production smoke: `.venv/bin/python tests/production_smoke.py` (network and configured production host may be required).
- Cloudflare dry run: `npm run deploy:cloudflare -- --dry-run --outdir /tmp/fambo-cloudflare-build`.

These commands mirror the existing GitHub Actions quality gate. Treat integration credentials as optional and verify all applicable checks before merging or deploying. Follow `AGENTS.md`.

### Known limitations

The local preview is a static development server with a narrow API implementation, not an authenticated Cloudflare Worker. Google OAuth requires a configured public client ID and permitted JavaScript origin. The current Google Calendar token lives only in browser memory. An authenticated, real-user Google OAuth flow must be verified separately in an authorized browser environment.
