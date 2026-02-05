import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { LayoutDashboard, ListTodo, Trash2, Users, FolderKanban } from 'lucide-react';

/**
 * Layout-Route (_layout.jsx)
 * 
 * Was ist eine Layout-Route in TanStack Router?
 * ------------------------------------------------
 * Eine Layout-Route ist eine spezielle Route, die mit einem Unterstrich (_) beginnt.
 * Sie rendert KEIN UI für sich selbst, sondern definiert ein gemeinsames Layout,
 * das von allen Kind-Routen geteilt wird.
 * 
 * Wie funktioniert es?
 * --------------------
 * 1. Diese Route wird NICHT in der URL angezeigt (z.B. keine /_layout URL)
 * 2. Alle Routen INNERHALB von src/routes/_layout/ nutzen automatisch dieses Layout
 * 3. Die <Outlet /> Komponente ist der Platzhalter, wo die Kind-Routen gerendert werden
 * 4. Das Layout bleibt bestehen, während zwischen Kind-Routen navigiert wird
 * 
 * Warum ist das nützlich für unsere Anwendung?
 * ---------------------------------------------
 * - Sidebar und Header müssen nur EINMAL definiert werden
 * - Navigation zwischen Dashboard, Aufgaben, Papierkorb behält das Layout bei
 * - Kein erneutes Rendern der Sidebar bei jedem Routenwechsel (bessere Performance)
 * - Gemeinsamer Zustand (z.B. collapsed Sidebar) bleibt über Seitenwechsel erhalten
 * - Clean Separation: Layout-Code ist getrennt von der Geschäftslogik einzelner Seiten
 * 
 * Beispiel-Struktur:
 * ------------------
 * src/routes/
 *   _layout.jsx          → Dieses Layout (mit Sidebar)
 *   _layout/
 *     dashboard.jsx      → Wird in <Outlet /> gerendert (URL: /dashboard)
 *     aufgaben.jsx       → Wird in <Outlet /> gerendert (URL: /aufgaben)
 *     papierkorb.jsx     → Wird in <Outlet /> gerendert (URL: /papierkorb)
 */

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Linke Navigation */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header mit Hamburger Menu */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <button className="p-1 hover:bg-gray-100 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Taskmanager</h1>
        </div>

        {/* Haupt-Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <LayoutDashboard size={18} />
                <span className="text-sm">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                to="/aufgaben"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <ListTodo size={18} />
                <span className="text-sm">Aufgaben</span>
              </Link>
            </li>
            <li>
              <Link
                to="/papierkorb"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <Trash2 size={18} />
                <span className="text-sm">Papierkorb</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Verwaltungs-Buttons (nur für Admins - später implementiert) */}
        <div className="p-3 border-t border-gray-200 space-y-1">
          <Link
            to="/admin/nutzer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors w-full text-left text-sm [&.active]:bg-blue-500 [&.active]:text-white"
          >
            <Users size={18} />
            <span>Nutzer verwalten</span>
          </Link>
          <Link
            to="/admin/projekt"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors w-full text-left text-sm [&.active]:bg-blue-500 [&.active]:text-white"
          >
            <FolderKanban size={18} />
            <span>Projekt verwalten</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area - Rechter Bereich */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Header mit Suchleiste und User-Menü */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Aufgabe suchen oder erstellen"
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3 ml-6">
              {/* Filter Icon */}
              <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
              
              {/* User Menu Button */}
              <button className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-md transition-colors">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">U</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Hier werden die Kind-Routen gerendert */}
        <main className="flex-1 overflow-auto p-6">
          {/* 
            <Outlet /> - Der zentrale Render-Platz für Kind-Routen
            
            Alle Routen in _layout/ werden hier angezeigt:
            - /dashboard -> dashboard.jsx wird hier gerendert
            - /aufgaben -> aufgaben.jsx wird hier gerendert
            - /papierkorb -> papierkorb.jsx wird hier gerendert
          */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
