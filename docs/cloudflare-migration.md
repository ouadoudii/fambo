# Fambo auf Cloudflare Workers

Fambo wurde für Cloudflare Workers mit Static Assets vorbereitet. Die bestehende Vercel-App bleibt bis zu den vollständigen Produktionsprüfungen erreichbar.

## Architektur

- `wrangler.jsonc`: Worker `fambo-family`, statische Dateien ausschließlich aus `dist/`.
- `cloudflare/worker.js`: private `/api/*`-Anfragen landen im Worker, alle anderen Pfade bei Cloudflare Static Assets.
- Wiederverwendung der bestehenden Fambo-API-Funktionen via `serveApi()`; keine Datenbank-Migration.
- Die Browserbase-Sitzung bleibt sicherheitsbedingt deaktiviert, solange kein exakt bestätigter Cloudflare-Produktionshost freigegeben ist. Keine Wildcard `*.workers.dev` und kein Freigeben für Deploy Previews.
- Node.js-APIs sind seit Compatibility Date 2026-08-04 für Workers standardmäßig aktiviert. Signierte Tickets und Hashes nutzen `node:crypto`. Die bestehenden API-Funktionen lesen serverseitig aus `process.env` (wird von Workers-Bindings zur Verfügung gestellt).

## Einrichtung

1. Cloudflare Dashboard → Workers & Pages → Create → Import repository `ouadoudii/fambo`, Branch `main`.
2. Das Repository liefert `wrangler.jsonc`; Build `npm run build` erzeugt `dist/`.
3. Nach dem ersten sicheren Deployment prüfen wir die konkrete `workers.dev`-Adresse und tragen **nur diesen exakten Host** in die Server-Allowlist ein. Ohne das bleibt der kostenpflichtige Browserstart gesperrt.
4. Cloudflare-Umgebungsvariablen als **Secrets**, nicht als `vars` im Repository: `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `FAMBO_AGENT_SIGNING_KEY`. Nicht über Chat oder GitHub übermitteln. Optional `SUPABASE_URL`, `SUPABASE_ANON_KEY` für alte Anmelde-API.
5. `FAMBO_AGENT_LAUNCH_ENABLED` und `FAMBO_AGENT_RATE_LIMIT_READY` bleiben bis zum echten Redis-EVAL-, Browserbase-Sitzungs- und WebUntis-Integrationstest deaktiviert.

## Qualitätskontrolle

Factory Quality Gate: Typecheck, Lint, Unit-/Contract-/Security-Tests, `npm audit`, Build, **Wrangler Dry-Run-Bundle**, echte Playwright-Browser-Tests auf Desktop und Mobile sowie API-Smoke-Tests. Merge und Freigabe erst nach grünem Gate. Ein Dry Run testet den Build, ersetzt aber **nicht** den Live-Test.

## Noch offen

GitHub-to-Cloudflare-Verbindung, Produktions-Deploy, serverseitige Secret-Einrichtung, Live-Browser/Redis-Tests und echte WebUntis-Stundenplanübernahme. Vercel nicht abschalten, bevor diese Checks nachweislich erfolgreich sind.

## Cloudflare Workers Builds: erforderlicher Deploy-Befehl

Cloudflare Workers Builds führt den Deploy-Befehl aus dem Dashboard aus. Laut aktueller Cloudflare-Dokumentation ignoriert Workers Builds die Custom-Build-Konfiguration im Wrangler-Konfigurationsfile. **Deshalb** im bestehenden Worker `fambo` unter **Settings → Build** als **Deploy command** exakt `npm run deploy:cloudflare` setzen. Das Skript erzeugt erst `dist/` und startet danach den Worker-Deploy. Root directory ist das Repository-Root. Den eigenen Build command kann man dann leer lassen, um einen redundanten Build zu vermeiden. Das ist eine Cloudflare-Dashboard-Einstellung, die nicht durch GitHub-Commits erzwungen werden kann.

Die GitHub-CI prüft dasselbe Skript mit `--dry-run`, ohne zu deployen. Ein grüner Dry Run bestätigt **nicht** den Account-Zugriff oder ein grünes Cloudflare-Deployment.

## Kein Dashboard-Build-Befehl mehr nötig (Cloudflare-Standard)

Cloudflare Workers Builds verwendet im Standard **`npx wrangler deploy`** und darf seinen optionalen Build-Befehl leer lassen. `wrangler.jsonc` verweist deshalb direkt auf die vier geprüften und im Repository versionierten statischen Dateien unter `cloudflare/public/`. Dadurch braucht der GitHub-verbundene Worker keine Änderung der Cloudflare Build/Deploy-Einstellungen. Bei jeder Frontend-Änderung müssen die vier Kopien mit geändert werden; `tests/cloudflare-static-assets.test.js` vergleicht die Inhalte bytegenau und blockiert Abweichungen vor Merge. Der alternative Befehl `npm run deploy:cloudflare` bleibt für manuelle CLI-Deployments verfügbar, ist im Dashboard aber nicht nötig.

**Wichtig:** Der bestehende Worker hat im Cloudflare-Dashboard noch `workers.dev` deaktiviert; eine veröffentlichte Worker-Version wird erst nach aktivierter Route erreichbar. Die Änderung am Repository ersetzt weder fehlende Cloudflare-Account-Autorisierung noch die Live-Verifikation.
