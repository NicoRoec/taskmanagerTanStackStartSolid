import { createFileRoute } from '@tanstack/react-router';
import { Plus, User, Calendar } from 'lucide-react';

export const Route = createFileRoute('/_layout/aufgaben')({
  component: AufgabenPage,
});

function AufgabenPage() {
  // Beispieldaten aus dem Mockup
  const aufgaben = [
    {
      id: 1,
      titel: 'Mockup erstellen',
      status: 'in Arbeit',
      statusColor: 'bg-yellow-100 text-yellow-800',
      nutzer: 'Nutzer123',
      faelligAm: '31.03.2026'
    },
    {
      id: 2,
      titel: 'Abgabe',
      status: 'neu',
      statusColor: 'bg-gray-100 text-gray-800',
      nutzer: 'Nutzer123',
      faelligAm: '10.04.2026'
    }
  ];

  return (
    <div className="h-full">
      {/* Header Bereich */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Prio∇ Aufgabenliste</h2>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-6 text-sm">
          <button className="text-gray-900 font-medium border-b-2 border-gray-900 pb-1">
            Zugewiesen an
          </button>
          <button className="text-gray-500 hover:text-gray-900 pb-1">
            Fällig am
          </button>
        </div>
      </div>

      {/* Aufgaben als Karten */}
      <div className="space-y-3">
        {aufgaben.map((aufgabe) => (
          <div
            key={aufgabe.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              {/* Linke Seite - Aufgabennummer und Titel */}
              <div className="flex gap-4 flex-1">
                <span className="text-gray-500 font-medium">{aufgabe.id}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-3">{aufgabe.titel}</h3>
                  
                  {/* Status Badge */}
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${aufgabe.statusColor}`}>
                    {aufgabe.status}
                  </span>
                </div>
              </div>

              {/* Rechte Seite - Nutzer und Datum */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span>{aufgabe.nutzer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{aufgabe.faelligAm}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button (FAB) - Plus Button unten rechts */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Neue Aufgabe erstellen"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
