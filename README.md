# LUPENREIN KI Vertrieb · V10

Produktionsnahe interne Vertriebs-Web-App für LUPENREIN Service GmbH. V10 verbindet Lead-Finder, KI-Websiteanalyse, CRM, Kommunikation, Aufgaben, Besichtigungen, Kalkulation, Angebote/PDF, Kundenobjekte, KPIs und einen kontrollierten Vertriebs-Agenten.

## V10 neu

- `/operations`: Produktionsstatus, Benutzerrolle, Agent-Läufe und Audit-Verlauf.
- `/api/health`: maschinenlesbarer Health-Check für Hosting/Monitoring.
- geschützte CRM-Routen via `middleware.ts`.
- Rollenbasis: `admin`, `sales`, `ops`, `read_only`.
- `audit_logs` und `agent_runs` in PostgreSQL/Supabase.
- Vertriebs-Agent priorisiert Leads und erzeugt Aufgaben; **kein automatischer Mailversand**.
- täglicher Cron-Endpunkt `/api/cron/daily-sales-agent` für produktive Deployments.
- `vercel.json` plant den Agenten täglich um 06:00 UTC. Das entspricht je nach Sommer-/Winterzeit 08:00 bzw. 07:00 Uhr in Berlin.
- `scripts/backup.sh` erzeugt mit `pg_dump` ein PostgreSQL-Backup, wenn `DATABASE_URL` gesetzt ist.

## Lokal starten

1. Node.js 20+ installieren.
2. `.env.example` nach `.env.local` kopieren.
3. `npm install`
4. `npm run dev`
5. `http://localhost:3000/login` öffnen.

Ohne Supabase läuft die App weiter mit dem lokalen JSON-Fallback. Dieser Modus ist nur für Entwicklung und Demonstration gedacht.

## Supabase-Produktion

1. Neues Supabase-Projekt anlegen.
2. Den Inhalt aus `database.sql` im SQL-Editor ausführen.
3. `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen.
4. Für Cron/Server-Automationen zusätzlich `SUPABASE_SERVICE_ROLE_KEY` setzen. **Dieser Key darf ausschließlich serverseitig liegen.**
5. Einen Benutzer in Supabase Auth anlegen und dessen Profil bei Bedarf einmalig auf `admin` setzen.
6. Produktionswerte für `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY` und Gmail OAuth setzen.

## Täglicher Agent

Der Agent prüft unter anderem:
- Leads mit Score >= 85, die noch nicht weit genug bearbeitet sind,
- interessierte Leads,
- Rückfragen in Antworten,
- fällige Wiedervorlagen,
- Besichtigungen ohne Abschluss,
- offene Angebote,
- Kontakte, bei denen seit mindestens vier Tagen kein weiterer Schritt erfolgt ist.

Er legt maximal zehn priorisierte Aufgaben pro Lauf an und vermeidet identische offene Dubletten. Er sendet **keine** E-Mails automatisch.

Für den Cron-Endpunkt werden `CRON_SECRET` und `SUPABASE_SERVICE_ROLE_KEY` benötigt. Bei Vercel wird das Cron-Secret als `Authorization: Bearer ...` erwartet.

## Backups

Mit installiertem PostgreSQL-Client und gesetzter `DATABASE_URL`:

```bash
./scripts/backup.sh
```

Das Skript erzeugt einen Custom-Format-Dump unter `backups/`. Für einen echten Produktivbetrieb sollte dieser Dump anschließend verschlüsselt in einen getrennten Storage/Backup-Dienst übertragen und regelmäßig testweise wiederhergestellt werden.

## Gmail

Die Gmail-Verbindung in ChatGPT ist nicht automatisch die OAuth-Verbindung dieser Web-App. Für die externe Anwendung müssen `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` und `GMAIL_REFRESH_TOKEN` aus einer eigenen autorisierten Google-OAuth-Konfiguration gesetzt werden. Der Workflow bleibt: CRM-Entwurf → Freigabe → Gmail-Draft → bewusster Versand.

## Vor dem Livegang prüfen

- `npm install && npm run build` erfolgreich.
- `.env`-Secrets nur im Hosting-Secret-Store, nie im Git-Repository.
- Supabase RLS aktiv und mit Testbenutzern geprüft.
- erster Benutzer korrekt als `admin` gesetzt.
- `/api/health` zeigt die benötigten Produktionsdienste als bereit.
- Backup und Restore einmal getestet.
- Google/OAuth Redirect-URIs auf die echte Domain gesetzt.
- Impressum/Datenschutz und rechtliche Regeln für Kontaktaufnahme geprüft.
- manueller Freigabeprozess für Akquise bleibt aktiv.

## Architekturhinweis

V10 ist bewusst so aufgebaut, dass die spätere SaaS-Version Mandanten-/Rollenlogik weiter ausbauen kann. Der aktuelle `owner_id` trennt bereits Benutzerdaten. Für echtes Multi-Tenant-SaaS wäre der nächste Schritt eine `organizations`/`memberships`-Schicht statt ausschließlich benutzerbezogener Besitzlogik.

## Live-Release 1.0.1

Die Live-Konfiguration unterstützt jetzt bevorzugt die neuen Supabase API Keys `sb_publishable_...` und `sb_secret_...`, mit Legacy-Fallback auf `anon` und `service_role`. Zusätzlich wurden `.gitignore`, Node-Engine, TypeScript-Checkskript und `LIVE-SETUP.md` ergänzt.
