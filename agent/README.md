# Fambo WebUntis Agent (lokaler Machbarkeitstest)

Dieser Prototyp ist **noch keine produktive automatische Synchronisation**. Er öffnet einen echten Chromium-Browser, in dem man sich selbst bei WebUntis anmeldet und den persönlichen Stundenplan öffnet. Erkennt er ein unterstütztes JSON-Stundenplanformat, speichert er nur Fächer, Zeiten, Räume und Ausfallstatus in `~/.fambo-webuntis/lessons.json` auf dem eigenen Rechner.

## Voraussetzungen

Python 3.11+, dann `pip install playwright` und `python -m playwright install chromium`.

## Start

`python agent/run.py`

Keine Kennwörter in Fambo, Konsole, Chat oder GitHub eingeben. Die Browser-Sitzung bleibt lokal im Profil `~/.fambo-webuntis/browser-profile`. Wer Zugriff auf dieses lokale Profil hat, könnte die Sitzung übernehmen; daher nur auf einem vertrauenswürdigen Rechner nutzen. Für ein späteres Cloud-Produkt ist eine separate sichere Sitzungsverwaltung erforderlich.

Der Test ist bewusst nicht unbeaufsichtigt und übernimmt keine Captchas/2FA automatisch. Er umgeht keine WebUntis-Schutzmaßnahmen. Schuleigene Nutzungsbedingungen und Zugriffsbeschränkungen gelten weiterhin.

**Offene Punkte vor Produktivbetrieb:** echtes WebUntis-Antwortformat mit einer freiwilligen Testanmeldung verifizieren, Sitzungsablauf, laufende Synchronisation, sichere Gerätebindung und autorisierter Datenabruf. Keine echten Schülerdaten auf öffentliches Fambo hochladen.
