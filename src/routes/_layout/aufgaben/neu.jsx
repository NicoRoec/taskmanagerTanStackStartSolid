import { createFileRoute, Link } from '@tanstack/react-router';

/**
 * Nested Route (Verschachtelte Route): /aufgaben/neu
 * -------------------------------------------------
 * Diese Datei liegt im Ordner "aufgaben" und ist damit eine Unterroute.
 * 
 * Dateistruktur:
 * src/routes/_layout/aufgaben/neu.jsx => URL: /aufgaben/neu
 * 
 * Wie funktionieren Nested Routes?
 * ---------------------------------
 * - Die Parent-Route ist /aufgaben (definiert in aufgaben.jsx)
 * - Diese Child-Route erweitert die Parent-Route mit /neu
 * - Beide Routen nutzen das gemeinsame Layout aus _layout.jsx
 * - Navigation zwischen ihnen ist nahtlos ohne Layout-Neurendering
 */

export const Route = createFileRoute('/_layout/aufgaben/neu')({
  component: AufgabeNeuPage,
});

function AufgabeNeuPage() {
  return (
    <div>
      {/* Header mit Navigation */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Task erstellen</h2>
        
        {/* Navigation zwischen Task-Liste und Task-Erstellung */}
        <div className="flex items-center gap-2">
          <Link
            to="/aufgaben"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Task-Liste
          </Link>
          <Link
            to="/aufgaben/neu"
            className="px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Task erstellen
          </Link>
        </div>
      </div>

      {/* Formular für neue Aufgabe */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 max-w-2xl">
        <div className="space-y-4">
          {/* Mockup erstellen - Titel Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mockup erstellen</label>
            <input 
              type="text" 
              placeholder="Hier die Beschreibung, man muss ein Mockup der Webpage erstellen, sodass wir alle die gleiche Vorstellung der Anforderung haben."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Prio, Mittel - Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prio: Mittel</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>Mittel</option>
                <option>Hoch</option>
                <option>Niedrig</option>
              </select>
            </div>
            
            {/* Status: In Arbeit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status: In Arbeit</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>In Arbeit</option>
                <option>Neu</option>
                <option>Erledigt</option>
              </select>
            </div>
            
            {/* Zugewiesen an */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zugewiesen an:</label>
              <input 
                type="text" 
                placeholder="Max Mustermann"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Fällig am */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fällig am: 31.03.2026</label>
            <input 
              type="date" 
              defaultValue="2026-03-31"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button className="px-6 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Speichern
            </button>
            <Link
              to="/aufgaben"
              className="px-6 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors inline-block"
            >
              Abbrechen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}