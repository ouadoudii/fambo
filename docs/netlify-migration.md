# Fambo – parallele Netlify-Migration

Netlify-Projekt: **fambo-family**. Vercel bleibt bis zur erfolgreichen Produktionsprüfung unverändert.

## Architektur

Netlify veröffentlicht nur `dist/` (aus `npm run build`). Ein einzelner Netlify Functions Entry-Point unter `netlify/functions/api.mjs` übersetzt `/api/*` auf exakt erlaubte vorhandene API-Handler. Kein Import aus URL-Pfaden, keine Cookies/Secrets in statischen Dateien. Die bestehenden WebUntis-, Browserbase- und Redis-Funktionen bleiben serverseitig.

Der Browserstart akzeptiert als zusätzliche Produktions-Origin `https://fambo-family.netlify.app`. Preview-Hosts dürfen **keine** Browserbase-Sitzungen starten. Netlify ist deshalb parallel testbar.

## Noch notwendige sichere Konfiguration

Nach Verbindung des GitHub-Repos `ouadoudii/fambo` mit dem Netlify-Projekt müssen die Netlify-Umgebungsvariablen im Funktionen-Scope hinterlegt werden:

- `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` (serverseitig, geheim)
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (serverseitig, geheim)
- `FAMBO_AGENT_SIGNING_KEY` (neuer, zufällig generierter Schlüssel mit mindestens 32 Bytes)
- `FAMBO_AGENT_LAUNCH_ENABLED` und `FAMBO_AGENT_RATE_LIMIT_READY` (beide **zunächst false**, bis ein echtes Budget-/Browser-Integrationstest erfolgreich war)
- Optional `SUPABASE_URL` und `SUPABASE_ANON_KEY` für die Alt-API. Die aktuelle Familienwand benötigt sie nicht.

Geheimnisse nie in GitHub, im Chat oder im Frontend eingeben. Die API-Wrapper lesen nur `process.env`, und Netlify Functions injizieren dafür ihre eigenen Functions-Environment-Variables. `.netlify/` gehört in `.gitignore`.

## Release-Gates

1. GitHub Factory Quality Gate vollständig grün (Node, Security, Build, Playwright Desktop/Mobile).
2. GitHub-Repository als Continuous Deployment mit Netlify verbinden.
3. Netlify Deployment-Status `ready`, Build-Commit identisch mit freigegebenem `main`.
4. GET `/api/agent/status` nur boolesche Antwort; `/api/agent/redis-health` und `/api/browserbase-health` serverseitig verifizieren.
5. Echte Browserflows, Mobilansicht, private Gerätebindung und keine Browserbase-Sitzung ohne wirksame Limits prüfen.
6. Erst danach neue Adresse öffentlich freigeben und ggf. alte Automationen auf den neuen Host umstellen.

**Nicht fertig:** Echte WebUntis-Anmeldung und automatischer Stundenplanimport müssen noch mit einer freiwilligen Testanmeldung überprüft werden. Anmeldung im Cloud-Browser ist keine automatische Stundenplansynchronisation.
