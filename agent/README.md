# Fambo WebUntis Agent (lokaler Machbarkeitstest)

Dieser Prototyp ist **noch keine produktive automatische Synchronisation**. Er öffnet einen echten Chromium-Browser, in dem man sich selbst bei WebUntis anmeldet und den persönlichen Stundenplan öffnet. Erkennt er ein unterstütztes JSON-Stundenplanformat, speichert er nur Fächer, Zeiten, Räume und Ausfallstatus in `~/.fambo-webuntis/lessons.json` auf dem eigenen Rechner.

## Voraussetzungen

Python 3.11+, dann `pip install playwright` und `python -m playwright install chromium`.

## Start

`python agent/run.py`

Keine Kennwörter in Fambo, Konsole, Chat oder GitHub eingeben. Die Browser-Sitzung bleibt lokal im Profil `~/.fambo-webuntis/browser-profile`. Wer Zugriff auf dieses lokale Profil hat, könnte die Sitzung übernehmen; daher nur auf einem vertrauenswürdigen Rechner nutzen. Für ein späteres Cloud-Produkt ist eine separate sichere Sitzungsverwaltung erforderlich.

Der Test ist bewusst nicht unbeaufsichtigt und übernimmt keine Captchas/2FA automatisch. Er umgeht keine WebUntis-Schutzmaßnahmen. Schuleigene Nutzungsbedingungen und Zugriffsbeschränkungen gelten weiterhin.

**Offene Punkte vor Produktivbetrieb:** echtes WebUntis-Antwortformat mit einer freiwilligen Testanmeldung verifizieren, Sitzungsablauf, laufende Synchronisation, sichere Gerätebindung und autorisierter Datenabruf. Keine echten Schülerdaten auf öffentliches Fambo hochladen.

## GitHub Actions

Der Chromium-Test `tests/agent_browser_test.py` simuliert die Netzwerkantwort einer WebUntis-Stundenplanseite und prüft, dass ausschließlich Unterrichtsinformationen extrahiert werden. Dieser Test benötigt **kein WebUntis-Konto, kein Passwort und keine Sitzungs-Cookies**. Er prüft **nicht**, ob eine echte Anmeldung in GitHub Actions möglich ist. Eine zeitgesteuerte Produktion-Synchronisation ist noch nicht eingerichtet.

## Browserbase-Anbindung (vorbereitet)

`agent/browserbase.js` kapselt die offizielle Browserbase-Sessions-API serverseitig: Sitzung anlegen, geschützten Browser-Viewer abrufen, Sitzung beenden. `tests/browserbase.test.js` simuliert die API und prüft, dass keine API-Schlüssel oder Verbindungs-Tokens in eine öffentliche Antwort gelangen.

In Vercel werden später **BROWSERBASE_API_KEY** und **BROWSERBASE_PROJECT_ID** als **sensitive bzw. encrypted Environment Variables** benötigt. Secrets gehören weder in Dateien noch in GitHub. Kein Benutzer muss Zugangsdaten im Chat veröffentlichen.

**Nicht für Produktion freigegeben:** Es existiert bewusst noch kein öffentlich erreichbarer Sitzungs-Start-Endpunkt. Dieser muss zuerst über eine private, gerätegebundene Berechtigung sowie harte Rate Limits und Sitzungslimits abgesichert werden. Auch der Browser-Viewer ist eine sensitive Berechtigung und darf nicht anderen Besuchern angezeigt werden. Nach Ablauf ist die Sitzung aktiv zu schließen.

Browserbase kann technisch Zugriff auf die dort ausgeführte authentifizierte WebUntis-Browsersitzung erhalten; die Anmeldung beim WebUntis-Original erfolgt manuell. Relevante Datenschutzregeln und WebUntis-Nutzungsbedingungen müssen berücksichtigt werden.
