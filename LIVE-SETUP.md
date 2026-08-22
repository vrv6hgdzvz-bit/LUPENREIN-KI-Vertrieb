# LUPENREIN KI Vertrieb – Live-Setup

## 1. Supabase

1. Neues Supabase-Projekt in einer EU-Region anlegen.
2. `database.sql` im SQL-Editor ausführen.
3. Einen Benutzer über Supabase Auth anlegen.
4. Client-seitig bevorzugt `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) setzen.
5. Server-seitig bevorzugt `SUPABASE_SECRET_KEY` (`sb_secret_...`) setzen.
6. `DATABASE_URL` nur serverseitig für Backups/DB-Zugriff setzen.
7. RLS für alle produktiv exponierten Tabellen kontrollieren.

Legacy `anon`/`service_role` bleiben als Fallback unterstützt, sollten bei einem neuen Projekt aber nicht die erste Wahl sein.

## 2. Vercel

1. Repository/Projekt importieren.
2. Framework: Next.js automatisch erkennen lassen.
3. Node.js 20+ verwenden.
4. Alle Werte aus `.env.example` in **Project Settings → Environment Variables** hinterlegen.
5. `APP_ENV=production` und `APP_BASE_URL=https://<deine-domain>` setzen.
6. `CRON_SECRET` als langes zufälliges Secret setzen.
7. Production deployen.
8. `/api/health` prüfen.

Der tägliche Sales-Agent läuft über Vercel Cron auf `/api/cron/daily-sales-agent`. Vercel sendet `CRON_SECRET` als Bearer-Token. Der Agent verschickt keine Akquise-E-Mails selbst.

## 3. Google Places

`GOOGLE_PLACES_API_KEY` serverseitig setzen und den Key im Google-Cloud-Projekt auf die benötigte Places API sowie passende Quoten/Billing-Beschränkungen begrenzen.

## 4. OpenAI

`OPENAI_API_KEY` nur serverseitig hinterlegen. Niemals als `NEXT_PUBLIC_*` Variable verwenden.

## 5. Gmail

Die Web-App benötigt eine eigene Google-OAuth-Anwendung. Danach `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` und einen autorisierten `GMAIL_REFRESH_TOKEN` setzen. Das in ChatGPT verbundene Gmail-Konto ist davon technisch getrennt.

## 6. Vor echtem Akquisebetrieb

- ersten Admin-Nutzer prüfen
- RLS mit mindestens zwei Testnutzern testen
- Test-Lead anlegen und Website-Analyse durchführen
- Angebot/PDF erzeugen
- Gmail-Draft mit Testadresse erzeugen, aber nicht an Fremde versenden
- Cron-Endpunkt einmal manuell mit Bearer-Token testen
- `pg_dump`-Backup erzeugen und Restore testen
- Datenschutz/UWG-Prozess und internen Freigabeprozess dokumentieren

## 7. Produktions-Check

```bash
npm install
npm run check
npm run build
npm start
```

Erst nach erfolgreichem Build live schalten.
