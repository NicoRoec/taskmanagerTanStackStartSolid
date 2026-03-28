import { createFileRoute, Outlet, Link, useNavigate, redirect } from '@tanstack/solid-router';
import { LayoutDashboard, ListTodo, Trash2, Users, LogOut, LogIn, Moon, Sun } from 'lucide-solid';
import { createSignal } from 'solid-js';
import { useAuth } from './__root';
import { useTheme } from './__root';
import { getSessionInfo } from '../server/auth-functions';

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
 */

function LayoutComponent() {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = createSignal(false);
  const { session, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navBaseClass = 'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors';
  const navInactiveClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
  const navActiveClass = 'bg-blue-600 text-white shadow-sm';

  async function handleLogout() {
    await logout();
    setShowUserMenu(false);
    navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="w-56">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Taskmanager</h1>
          </div>
          <div className="flex-1 flex items-center justify-end">
            <div className="flex items-center gap-3">
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
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu())}
                  className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
                    <span className="text-sm font-medium">{session?.username ? session.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                </button>
                {showUserMenu() && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Angemeldet als</p>
                          <p className="font-medium text-gray-900 dark:text-white">{session?.username}</p>
                        </div>
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
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <nav className="flex-1 p-3">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className={`${navBaseClass} ${navInactiveClass}`}
                activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}
              >
                <span className="shrink-0">
                  <LayoutDashboard size={18} />
                </span>
                <span className="text-sm leading-none">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                to="/aufgaben"
                className={`${navBaseClass} ${navInactiveClass}`}
                activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}
              >
                <span className="shrink-0">
                  <ListTodo size={18} />
                </span>
                <span className="text-sm leading-none">Aufgaben</span>
              </Link>
            </li>
            <li>
              <Link
                to="/papierkorb"
                className={`${navBaseClass} ${navInactiveClass}`}
                activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}
              >
                <span className="shrink-0">
                  <Trash2 size={18} />
                </span>
                <span className="text-sm leading-none">Papierkorb</span>
              </Link>
            </li>
          </ul>
        </nav>
        {isAuthenticated && isAdmin && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <Link
              to="/admin/nutzer"
              className={`${navBaseClass} ${navInactiveClass}`}
              activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}
            >
              <span className="shrink-0">
                <Users size={18} />
              </span>
              <span className="leading-none">Nutzer verwalten</span>
            </Link>
          </div>
        )}
      </aside>
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          <main className="flex-1 overflow-hidden p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
  pendingComponent: () => (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">Layout wird geladen...</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Fehler in Layout-Route</h3>
          <p className="text-sm text-red-800 dark:text-red-200 mb-2">{error?.message ? String(error.message) : String(error)}</p>
          {error?.stack && (
            <pre className="text-xs whitespace-pre-wrap text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 p-2 rounded overflow-auto max-h-32">
              {String(error.stack)}
            </pre>
          )}
        </div>
      </div>
    </div>
  ),
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
    if (!session?.authenticated) {
      throw redirect({ to: '/login' });
    }
  },
});
