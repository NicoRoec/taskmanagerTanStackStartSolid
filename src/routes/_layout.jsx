import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, ListTodo, Trash2, Users, FolderKanban, LogOut, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './__root';

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
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { session, isAuthenticated, isAdmin, logout } = useAuth();

  async function handleLogout() {
    await logout();
    setShowUserMenu(false);
    navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen bg-gray-100 flex-col">
      {/* Header über die komplette Breite */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Linker Bereich: App-Titel (gleichbreit wie Sidebar) */}
          <div className="w-56">
            <h1 className="text-lg font-semibold text-gray-800">Taskmanager</h1>
          </div>

          {/* Suchleiste startet dort, wo auch der Inhalt beginnt */}
          <div className="flex-1 flex items-center justify-between">
            <div className="max-w-md w-full">
              <input
                type="text"
                placeholder="Aufgabe suchen..."
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3 ml-6">
              {/* User Menu Button - Dropdown mit Login/Logout */}
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
                    <span className="text-sm font-medium">{session?.username ? session.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {isAuthenticated ? (
                      <>
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Angemeldet als</p>
                          <p className="font-medium text-gray-900">{session?.username}</p>
                        </div>

                        {/* Logout Button */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} />
                          Abmelden
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Login Button */}
                        <Link
                          to="/login"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <LogIn size={16} />
                          Anmelden
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Linke Navigation */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
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
        {isAuthenticated && isAdmin && (
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
        )}
      </aside>

        {/* Main Content Area - Rechter Bereich */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
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
    </div>
  );
}
