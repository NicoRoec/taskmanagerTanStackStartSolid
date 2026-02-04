# Taskmanager - Layout Implementation

## Übersicht

Das Haupt-Layout der Taskmanager-Anwendung wurde basierend auf dem bereitgestellten Mockup implementiert.

## Implementierte Features

### Layout-Struktur

- **Layout-Route** (`_layout.jsx`): Zentrale Layout-Route mit TanStack Router
- **Sidebar**: Linke Navigation mit Haupt- und Verwaltungsmenü
- **Header**: Oberer Bereich mit Suchleiste und Benutzermenü
- **Main Content**: Rechter Bereich für Seiteninhalte

### Routen

Die folgenden Routen wurden implementiert:

1. **Dashboard** (`/dashboard`): Übersichtsseite mit Statistikkarten
2. **Aufgaben** (`/aufgaben`): Aufgabenliste mit Beispieldaten aus dem Mockup
3. **Papierkorb** (`/papierkorb`): Ansicht für gelöschte Aufgaben

### TanStack Router Layout Routes

#### Was ist eine Layout-Route?

Eine Layout-Route in TanStack Router beginnt mit einem Unterstrich (`_`) und rendert kein eigenes UI in der URL. Sie definiert ein gemeinsames Layout, das von allen Kind-Routen geteilt wird.

#### Wie funktioniert es?

```
src/routes/
  _layout.jsx          → Layout-Komponente (wird nicht in URL angezeigt)
  _layout/
    dashboard.jsx      → /dashboard Route
    aufgaben.jsx       → /aufgaben Route
    papierkorb.jsx     → /papierkorb Route
```

#### Vorteile für diese Anwendung

- **Einmalige Definition**: Sidebar und Header werden nur einmal definiert
- **Persistentes Layout**: Layout bleibt beim Wechseln zwischen Seiten erhalten
- **Performance**: Keine erneute Renderung der Navigation bei Routenwechsel
- **Zustandsverwaltung**: Gemeinsamer Zustand bleibt über Seitenwechsel hinweg erhalten
- **Clean Separation**: Trennung von Layout-Code und Geschäftslogik

## Technologie-Stack

- **React** (JavaScript)
- **TanStack Router** für Routing
- **Tailwind CSS** für Styling
- **Lucide React** für Icons

## Styling

Alle Komponenten verwenden Tailwind CSS-Klassen für konsistentes Styling:

- Farbschema: Grau-Töne mit blauen Akzenten
- Responsive Design-Utilities
- Hover- und Active-States für Interaktivität

## Navigation

Die Sidebar enthält:

### Haupt-Navigation

- 🏠 **Dashboard**: Übersicht
- ✓ **Aufgaben**: Aufgabenverwaltung
- 🗑️ **Papierkorb**: Gelöschte Elemente

### Verwaltungsbereich (nur für Admins)

- 👥 **Nutzer verwalten**: Benutzerverwaltung (noch nicht implementiert)
- 📁 **Projekt verwalten**: Projektverwaltung (noch nicht implementiert)

## Nächste Schritte

Die folgenden Features sind für die zukünftige Implementierung vorgesehen:

1. **Datenverwaltung**: Integration mit Backend/Datenbank
2. **Authentifizierung**: Login und Rechteverwaltung
3. **CRUD-Operationen**: Aufgaben erstellen, bearbeiten, löschen
4. **Echte Daten**: Ersetzen der Platzhalter durch echte Daten
5. **User Management**: Admin-Bereich für Benutzerverwaltung
6. **Projekt Management**: Admin-Bereich für Projektverwaltung

## Entwicklung

```bash
# Installation
npm install

# Dev Server starten
npm run dev

# Build
npm run build
```

Die Anwendung läuft standardmäßig auf `http://localhost:3000`.
