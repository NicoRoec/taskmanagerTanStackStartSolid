import { createFileRoute } from '@tanstack/react-router';
import { FolderPlus, Settings, Archive } from 'lucide-react';

/**
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
        <h2 className="text-2xl font-bold text-gray-900">Projekt verwalten</h2>
        <p className="text-sm text-gray-600 mt-1">
          Verwalte Projekte und deren Einstellungen
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
          <FolderPlus size={18} />
          <span>Neues Projekt</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
          <Archive size={18} />
          <span>Archivierte anzeigen</span>
        </button>
      </div>

      {/* Projekt-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projekte.map((projekt) => (
          <div key={projekt.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{projekt.name}</h3>
                <p className="text-sm text-gray-600">{projekt.beschreibung}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                <Settings size={18} className="text-gray-400" />
              </button>
            </div>
            
            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                projekt.status === 'Aktiv' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {projekt.status}
              </span>
            </div>

            {/* Statistiken */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">Aufgaben</p>
                <p className="text-lg font-semibold text-gray-900">{projekt.aufgaben}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Mitglieder</p>
                <p className="text-lg font-semibold text-gray-900">{projekt.mitglieder}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Erstellt</p>
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
