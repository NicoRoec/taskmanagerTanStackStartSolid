import { createFileRoute, redirect } from '@tanstack/solid-router'
import { FolderPlus, Settings, Archive } from 'lucide-solid';
import { getSessionInfo } from '../../../server/auth-functions';

/**
 * Route-Schutz in TanStack Router - beforeLoad Guard
 * ===================================================
 * 
 * Die beforeLoad-Funktion wird VOR dem Rendern der Komponente aufgerufen.
 * Sie kann:
 * 1. Daten vorausladen (Pre-fetching)
 * 2. Authentifizierung/Autorisierung prüfen
 * 3. Die Navigation blockieren oder umleiten
 * 
 * Serverseite Durchsetzung:
 * Bei Server-Side Rendering wird beforeLoad auf dem Server ausgeführt,
 * BEVOR die Seite zum Client gesendet wird. Das verhindert, dass nicht
 * autorisierte Benutzer den HTML-Code überhaupt sehen können.
 * 
 * Nested Route im Admin-Bereich: /admin/projekt
 * -----------------------------------------------
 * Diese Datei liegt im admin-Ordner und erstellt eine weitere
 * Unterroute für die Projektverwaltung.
 * 
 * Dateistruktur:
 * src/routes/_layout/admin/projekt.jsx => URL: /admin/projekt
 * 
 * Verschachtelung:
 * - Beide Admin-Routen (nutzer.jsx und projekt.jsx) liegen
 *   im selben admin-Ordner
 * - Sie teilen sich das gemeinsame _layout aus der Parent-Ebene
 * - URL-Struktur: /admin/nutzer und /admin/projekt
 */

export const Route = createFileRoute('/_layout/admin/projekt')({
  component: AdminProjektPage,
  pendingComponent: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
      Projekte werden geladen...
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <h3 className="mb-2 font-semibold">Fehler in Projekt-Route</h3>
      <p>{error?.message ? String(error.message) : String(error)}</p>
    </div>
  ),
  /**
   * beforeLoad: Route-Schutz für Admin-Only Zugriff
   * 
   * Diese Funktion wird BEVOR die Komponente gerendert wird aufgerufen.
   * Serverseitig wird die Session geprüft.
   */
  beforeLoad: async () => {
    const sessionId =
      typeof document !== 'undefined'
        ? document.cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('task_session='))
            ?.split('=')[1] || null
        : null;

    const session = await getSessionInfo({ data: { sessionId } });

    if (!session?.authenticated || session.role !== 'admin') {
      throw redirect({ to: '/login' });
    }
  },
});

function AdminProjektPage() {
  // Beispiel-Projektdaten
  const projekte = [
    {
      id: 1,
      name: 'Taskmanager App',
      beschreibung: 'Hauptprojekt für Aufgabenverwaltung',
      aufgaben: 45,
      mitglieder: 8,
      status: 'Aktiv',
      erstellt: '15.01.2026',
    },
    {
      id: 2,
      name: 'Mobile App',
      beschreibung: 'Mobile Version des Taskmanagers',
      aufgaben: 23,
      mitglieder: 4,
      status: 'In Planung',
      erstellt: '01.02.2026',
    },
    {
      id: 3,
      name: 'API Integration',
      beschreibung: 'REST API für externe Services',
      aufgaben: 12,
      mitglieder: 3,
      status: 'Aktiv',
      erstellt: '20.12.2025',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Projekt verwalten</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Verwalte Projekte und deren Einstellungen
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
          <FolderPlus size={18} />
          <span>Neues Projekt</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
          <Archive size={18} />
          <span>Archivierte anzeigen</span>
        </button>
      </div>

      {/* Projekt-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projekte.map((projekt) => (
          <div key={projekt.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{projekt.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{projekt.beschreibung}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <Settings size={18} className="text-gray-400" />
              </button>
            </div>
            
            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                projekt.status === 'Aktiv' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
              }`}>
                {projekt.status}
              </span>
            </div>

            {/* Statistiken */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aufgaben</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{projekt.aufgaben}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mitglieder</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{projekt.mitglieder}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Erstellt</p>
                <p className="text-sm text-gray-600">{projekt.erstellt}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State für neue Projekte */}
      <div className="mt-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <FolderPlus size={48} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Weitere Projekte hinzufügen</h3>
        <p className="text-sm text-gray-600 mb-4">
          Erstelle neue Projekte, um deine Aufgaben besser zu organisieren
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
          Projekt erstellen
        </button>
      </div>
    </div>
  );
}
