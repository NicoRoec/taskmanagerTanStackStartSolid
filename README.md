# Task Manager (TanStack Start + React)

## 1) Projektüberblick

Dieses Repository enthält eine Fullstack-Task-Manager-Anwendung auf Basis von TanStack Start, React und SQLite. Der Schwerpunkt liegt auf einer klaren Trennung zwischen Client-UI und serverseitiger Geschäftslogik über TanStack Server Functions.

Die Anwendung bietet Rollen (Admin/User), Aufgabenverwaltung mit Soft Delete (Papierkorb), Dashboard-Kennzahlen sowie einen Admin-Bereich zur Nutzerverwaltung. Obwohl im Projektkontext häufig „Solid“ erwähnt wird, ist die konkrete Implementierung hier React-basiert.

## 2) Tech-Stack

- Runtime/Build: Vite, TanStack Start, Nitro, Node.js
- UI: React, Tailwind CSS, Lucide Icons
- Datenbank: SQLite (`sqlite3`)
- Validierung: Zod
- Tests: Vitest

### TanStack (tatsächlich genutzt)

- Wir nutzen `@tanstack/react-start` für Server Functions (Auth, Task- und User-Operationen).
- Wir nutzen `@tanstack/react-router` für file-based Routing, Navigation, Route Guards und URL-Search-State.
- Wir nutzen `@tanstack/react-router-ssr-query` für die Integration von Router und Query-Client im SSR-Kontext.
- Wir nutzen `@tanstack/react-query` für Datenladen, Mutationen, Caching und Invalidation.
- Wir nutzen `@tanstack/react-form` für Form-State und Validierung (Login, Aufgaben, Admin-Nutzer).
- Wir nutzen `@tanstack/react-table` für headless Tabellenlogik (Sortierung, Rendering, Actions).
- Wir nutzen `@tanstack/react-virtual` für Listen-Virtualisierung in der Aufgabenansicht.
- Wir nutzen `@tanstack/store` + `@tanstack/react-store` für globalen Theme-State (Dark/Light).
- Wir nutzen `@tanstack/react-devtools`, `@tanstack/react-router-devtools`, `@tanstack/react-query-devtools`, `@tanstack/devtools-event-client` für Devtools-Integration.
- Wir nutzen `@tanstack/devtools-vite` in der Vite-Konfiguration.

### Installiert, aber im App-Flow nicht genutzt

- `@tanstack/db`
- `@tanstack/router-plugin`
- `@tanstack/solid-form`
- `@tanstack/solid-query`
- `@tanstack/solid-table`
- `@tanstack/match-sorter-utils` (nur in Demo-Dateien unter `src/routes/demo`)

## 3) Setup & Start

### Voraussetzungen

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Entwicklung starten

```bash
npm run dev
```

Die App läuft standardmäßig auf Port `3000`.

### Build / Preview / Test

```bash
npm run build
npm run preview
npm run test
```

### Datenbank-Initialisierung / „Migrationen"

Es gibt keine separaten CLI-Migrationsskripte. Stattdessen initialisiert die Anwendung beim ersten Serverzugriff automatisch:

- Datenbankdatei: `data/taskmanager.db`
- Tabellen: `users`, `tasks`
- einfache, codebasierte Migrationsschritte (z. B. `assigned_to`)
- Seed-Daten (Nutzer + Beispiel-Tasks + Virtualisierungs-Demo-Datensätze)

Wenn du einen frischen Zustand willst, lösche `data/taskmanager.db` und starte die App neu.

## 4) Nutzer & Rollen

### Login (hartcodierte Demo-Credentials)

- Admin: `admin / admin`
- User: `user / user`

Die Login-Validierung läuft serverseitig über eine Server Function.

### Rollenmodell

- `admin`: erweitere Rechte (z. B. Nutzerverwaltung, permanentes Löschen im Papierkorb)
- `user`: eingeschränkte Rechte

Hinweis: Zusätzlich gibt es Seed-Einträge in der `users`-Tabelle (z. B. `Max Mustermann`, `Erika Musterfrau`) für Demo-/Tabellenzwecke.

## 5) Features

- Aufgabenliste (`/aufgaben`) mit Suche (URL-gebunden), Sortierung, Erstellen, Bearbeiten, Soft Delete
- Dashboard (`/dashboard`) mit Status-KPIs und letzten Aktivitäten
- Papierkorb (`/papierkorb`) mit Wiederherstellen und (nur Admin) endgültigem Löschen
- Admin-Nutzerverwaltung (`/admin/nutzer`) mit Create/Update/Delete

### CRUD-Verhalten inkl. Papierkorb

- Create: neue Task wird in `tasks` geschrieben (`is_deleted = 0`)
- Read: aktive Liste filtert auf `is_deleted = 0`
- Update: nur für aktive Tasks; gelöschte Tasks sind nicht editierbar
- Delete (soft): setzt `is_deleted = 1` (Papierkorb)
- Restore: setzt `is_deleted = 0`
- Permanent Delete: entfernt Datensatz physisch aus DB (nur Admin)

## 6) Datenmodell

### Tabelle `users`

- `id` (PK)
- `name` (unique fachlich, technisch nicht als Constraint)
- `email` (UNIQUE)
- `role` (`admin` | `user`)
- `created_at`, `updated_at`

### Tabelle `tasks`

- `id` (PK)
- `title`, `status`, `priority`, `due_date`
- `owner_id` (Ersteller)
- `assigned_to` (Name des zuständigen Nutzers)
- `is_deleted` (`0` aktiv, `1` Papierkorb)
- `created_at`, `updated_at`

## 7) Architektur

### Routing

- File-based Routing unter `src/routes`
- Root + Layout-Struktur mit geschütztem Bereich (`/_layout/...`)
- Guards über `beforeLoad` (z. B. Admin-Bereich)
- URL-Search-State für Aufgaben-Suche (`q`)

### Server Functions

- Auth: Login, Logout, Session-Info
- Tasks: Listen, Dashboard, Create, Update, Soft Delete, Restore, Permanent Delete
- Users: Admin-CRUD

### Form/Table/Query Zusammenspiel

- `react-form` steuert Eingaben + Validierung
- `react-query` lädt Daten und führt Mutationen aus
- `react-table` rendert Tabellenlogik headless
- `react-virtual` optimiert große Tasklisten

## 8) Sicherheitsregeln

- Autorisierung wird serverseitig geprüft (nicht nur UI-seitig)
- Admin-Routen prüfen Rolle via Guard (`beforeLoad`)
- Task-Operationen prüfen Session und Ownership-/Assignee-Regeln
- Bearbeiten von Papierkorb-Tasks ist serverseitig blockiert (`is_deleted = 0` Voraussetzung für Update)

Wichtige Einschränkungen der aktuellen Demo-Sicherheit:

- In-Memory Sessions (nicht persistent)
- Demo-Credentials hardcodiert
- Passwörter im Klartextvergleich
- Session-Cookie wird clientseitig gesetzt, nicht als `HttpOnly`-Cookie
