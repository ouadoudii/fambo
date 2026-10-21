# Browserbase-Agent: sichere Startfreigabe

Die Fambo-Web-App braucht weder ChatGPT Work noch ein Fambo-Benutzerkonto. Für WebUntis wird später eine interaktive Browserbase-Sitzung verwendet, deren Cookie an genau einen Browser gebunden ist.

## Umgesetzter Schutz

- `POST /api/agent/start`: Nur gültige Same-Origin-POSTs, nur explizit freigegebene Serverkonfiguration, atomare Reservierung **vor** kostenpflichtigem Browserstart. Ohne diese Voraussetzungen entsteht keine Sitzung.
- `GET /api/agent/session`: Nur mit gültigem signierten, kurzlebigen Geräte-Ticket. Gibt einen vertraulichen Browser-Viewer an den Besitzer zurück.
- `DELETE /api/agent/session`: Schließt die eigene Sitzung nur mit signiertem Ticket und passender Origin.
- `lib/agent-budget.js`: Upstash-Redis-Lua-Transaktion. Maximal **3 Starts/Tag global**, **1 Start/Tag je Gerät** und **1 gleichzeitige Sitzung global**, 15-Minuten-Lock; Zähler bleiben bei Fehlern verbraucht, damit keine unbegrenzten Wiederholungen möglich sind.
- Gerätedaten werden vor Speicherung in Redis gehasht, Tokens bleiben HttpOnly, Secure, SameSite=Strict; Antwortdaten werden nicht gecacht.

## Bis zur vollständigen Freigabe deaktiviert

Derzeit fehlen Upstash-Redis-Zugangsdaten sowie die erforderlichen Vercel-Variablen `FAMBO_AGENT_LAUNCH_ENABLED`, `FAMBO_AGENT_RATE_LIMIT_READY` und `FAMBO_AGENT_SIGNING_KEY`. **Diese Flags dürfen nicht aktiviert werden, bevor das Redis-Konto inklusive Kosten-/Budgetgrenzen eingerichtet und die echte WebUntis-Sitzung kontrolliert getestet ist.**

Die öffentliche Fambo-Oberfläche bietet deshalb noch keinen Browserstart an. Ein öffentliches Browserstart-API ohne atomare Beschränkung würde die kostenlosen Browserbase-Minuten verbrauchen und missbraucht werden können. Keine Secrets in GitHub oder im Chat übermitteln. Browserbase verarbeitet technisch die angemeldete Sitzung; WebUntis-Captcha oder Zwei-Faktor-Anmeldung nicht umgehen.

## Nächster Test

Einen geschützten Redis-Dienst bereitstellen und `UPSTASH_REDIS_REST_URL` sowie `UPSTASH_REDIS_REST_TOKEN` als Vercel Sensitive Environment Variables hinterlegen. Anschließend atomare Reservierung gegen echte Redis-Testumgebung, parallele Requests, Browsersitzung und Viewer im Browser testen; danach UI aktivieren und verifizieren, dass der WebUntis-Stundenplan wirklich lesbar ist.
