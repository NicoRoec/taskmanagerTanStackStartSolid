import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, ListTodo, Trash2, Users, FolderKanban, LogOut, LogIn, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './__root';
import { useTheme } from './__root';

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
  const { isDarkMode, toggleTheme } = useTheme();

  async function handleLogout() {
    await logout();
    setShowUserMenu(false);
    navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 flex-col">
      {/* Header über die komplette Breite */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Linker Bereich: App-Titel (gleichbreit wie Sidebar) */}
          <div className="w-56">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Taskmanager</h1>
          </div>

          {/* User Menu Bereich */}
          <div className="flex-1 flex items-center justify-end">
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle Button */}
              {/*
                Dark Mode Toggle
                -----------------
                TanStack Store reagiert auf Button-Klicks und aktualisiert:
                1. themeStore.state.darkMode
                2. localStorage speichert Präferenz
                3. HTML Element erhält oder verliert 'dark' Klasse
                4. Alle Tailwind dark: Klassen werden aktiviert/deaktiviert
                
                Icons:
                - Moon = Dark Mode aktiv (zeigt dass man zu Light Mode switchenkan)
                - Sun = Light Mode aktiv (zeigt dass man zu Dark Mode switchenkan)
              */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title={isDarkMode ? 'Zum Light Mode' : 'Zum Dark Mode'}
                aria-label="Theme wechseln"
              >
                {isDarkMode ? (
                  <Sun size={18} className="text-yellow-500" />
                ) : (
                  <Moon size={18} className="text-gray-600" />
                )}
              </button>
              {/* User Menu Button - Dropdown mit Login/Logout */}
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
                    <span className="text-sm font-medium">{session?.username ? session.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                    {isAuthenticated ? (
                      <>
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Angemeldet als</p>
                          <p className="font-medium text-gray-900 dark:text-white">{session?.username}</p>
                        </div>

                        {/* Logout Button */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
                          className="flex items-center gap-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
        <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Haupt-Navigation */}
          <nav className="flex-1 p-3">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <LayoutDashboard size={18} />
                <span className="text-sm">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                to="/aufgaben"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <ListTodo size={18} />
                <span className="text-sm">Aufgaben</span>
              </Link>
            </li>
            <li>
              <Link
                to="/papierkorb"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors [&.active]:bg-blue-500 [&.active]:text-white"
              >
                <Trash2 size={18} />
                <span className="text-sm">Papierkorb</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Verwaltungs-Buttons (nur für Admins - später implementiert) */}
        {isAuthenticated && isAdmin && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <Link
              to="/admin/nutzer"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left text-sm [&.active]:bg-blue-500 [&.active]:text-white"
            >
              <Users size={18} />
              <span>Nutzer verwalten</span>
            </Link>
            <Link
              to="/admin/projekt"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left text-sm [&.active]:bg-blue-500 [&.active]:text-white"
            >
              <FolderKanban size={18} />
              <span>Projekt verwalten</span>
            </Link>
          </div>
        )}
      </aside>

        {/* Main Content Area - Rechter Bereich */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
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
