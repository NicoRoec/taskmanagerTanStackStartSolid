import { createFileRoute, redirect } from '@tanstack/react-router';
import { UserPlus, Mail, Shield } from 'lucide-react';
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
 * Wenn die Funktion einen Fehler wirft oder navigiert,
 * wird die Komponente NICHT gerendert.
 * 
 * Warum beforeLoad und nicht direkt in der Komponente?
 * -------------------------------------------------------
 * 1. **Server-seitig erzwingbar**: Bei SSR kann beforeLoad auf dem Server
 *    ausgeführt werden, BEVOR HTML gesendet wird
 * 2. **Early Exit**: Navigation passiert vor Code-Splitting
 * 3. **Konsistenz**: Schützt die Route unabhängig vom Client
 * 4. **Performance**: Lädt geschützte Ressourcen nicht unnötig
 * 
 * Beispiel:
 * ```
 * beforeLoad: () => {
 *   const session = await getSessionInfo()
 *   if (!session?.authenticated || session.role !== 'admin') {
 *     throw redirect({ to: '/login' })
 *   }
 * }
 * ```
 * 
 * Datei-basiertes Routing (Admin-Bereich)
 * Pfad der Datei: src/routes/_layout/admin/nutzer.jsx
 * Daraus wird automatisch die URL: /admin/nutzer
 * 
 * Diese Route ist Teil des Admin-Bereichs und liegt im
 * admin-Unterordner, wodurch sie automatisch unter /admin/
 * gruppiert wird.
 */

export const Route = createFileRoute('/_layout/admin/nutzer')({
  component: AdminNutzerPage,
  /**
   * beforeLoad: Schutz-Gate vor dem Rendern
   * 
   * Diese Funktion wird aufgerufen, BEVOR die Komponente gerendert wird.
   * Serverseitig: Session wird im Server Function geprüft.
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

function AdminNutzerPage() {
  // Beispiel-Nutzerdaten aus dem Mockup
  const nutzer = [
    {
      id: 1,
      name: 'Erika Musterfrau',
      aufgaben: 3,
      rolle: 'User',
      zuletztAktiv: '26.1.2026',
    },
    {
      id: 2,
      name: 'Max Mustermann',
      aufgaben: 42,
      rolle: 'Admin',
      zuletztAktiv: 'heute',
    },
    {
      id: 3,
      name: 'Jon Doe',
      aufgaben: 5,
      rolle: 'User',
      zuletztAktiv: '01.01.1970',
    },
    {
      id: 4,
      name: 'Chris Coder',
      aufgaben: 1,
      rolle: 'User',
      zuletztAktiv: '02.02.2026',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutzer verwalten</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Verwalte Benutzer und deren Berechtigungen
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
          <UserPlus size={18} />
          <span>Nutzer hinzufügen</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
          <Mail size={18} />
          <span>Einladung senden</span>
        </button>
      </div>

      {/* Nutzer-Tabelle */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Tabellen-Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300">
          <div className="col-span-4">Nutzer</div>
          <div className="col-span-2">Aufgaben</div>
          <div className="col-span-2">Rolle</div>
          <div className="col-span-3">Zuletzt aktiv</div>
          <div className="col-span-1 text-right">Aktionen</div>
        </div>
        
        {/* Tabellen-Zeilen */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {nutzer.map((user) => (
            <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">user{user.id}@example.com</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-gray-700 dark:text-gray-300">{user.aufgaben}</div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                  user.rolle === 'Admin' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {user.rolle === 'Admin' && <Shield size={12} />}
                  {user.rolle}
                </span>
              </div>
              <div className="col-span-3 text-gray-600 dark:text-gray-400 text-sm">{user.zuletztAktiv}</div>
              <div className="col-span-1 text-right">
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="5" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="15" r="1.5" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
