# Fambo

Familienplaner für Wand-Tablet mit zwei WebUntis-Stundenplänen.

Die erste Implementierung wird über einen Feature-Branch und Pull Request eingebracht.

## Registrierung (in Vorbereitung)

Die App nutzt Supabase Auth (E-Mail/Passwort) und eine Family-Plans-Tabelle mit RLS. Die SQL-Migration steht in `supabase/migrations`. Im Supabase-Dashboard **E-Mail-Bestätigung aktivieren**.

In Vercel die beiden Environment Variables `SUPABASE_URL` und `SUPABASE_ANON_KEY` setzen. Niemals Service-Role-Keys eintragen. Beide werden von `/api/config` als öffentliche Konfiguration bereitgestellt.

Bevor die Vercel-Sperre entfernt wird, müssen Registrierung, Anmeldung, Abmeldung, serverseitiger 401-Schutz und Isolation zweier verschiedener Konten **in der Produktion** geprüft werden. Aktuell kann die Migration aufgrund fehlendem Supabase-Connector-Zugriff nicht ausgeführt werden.
