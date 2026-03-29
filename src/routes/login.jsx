import { createFileRoute, useNavigate } from '@tanstack/solid-router'
import { createSignal } from 'solid-js';
import { AlertCircle } from 'lucide-solid';
import { loginUser } from '../server/auth-functions';
import { useAuth } from './__root';

export const Route = createFileRoute('/login')({
  component: LoginPage,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="font-semibold mb-1">Login wird vorbereitet...</p>
          <p className="text-xs opacity-75">Bitte warten Sie einen Moment.</p>
        </div>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Fehler in Login-Route</h3>
          <p className="text-sm text-red-800 dark:text-red-200">{error?.message ? String(error.message) : String(error)}</p>
        </div>
      </div>
    </div>
  ),
});

function LoginPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  /**
   * Formular absenden - Server Function aufrufen
   * 
  * Dies zeigt, wie eine Server Function aufgerufen wird:
  * 1. Client sende Benutzerdaten an loginUser()
   * 2. Funktion läuft auf dem Server (Passwort wird validiert)
   * 3. Wenn erfolgreich: Session-ID wird zurückgegeben
  * 4. Session-ID wird in einem Cookie gespeichert
   * 5. Navigation zu Dashboard
   * 
   * Wichtig: Das Passwort wird hier nicht gehashed, nur zum Vergleich verwendet!
   * In Produktion: bcrypt oder scrypt verwenden!
   */
  async function handleLogin(e) {
    e.preventDefault();

    if (!username().trim() || !password().trim()) {
      setError('Bitte Benutzername und Passwort eingeben');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await loginUser({
        data: { username: username(), password: password() },
      });

      if (!result.success) {
        setError(result.error || 'Login fehlgeschlagen');
        return;
      }

      if (result.sessionId) {
        document.cookie = `task_session=${encodeURIComponent(result.sessionId)}; path=/; samesite=lax`;
        await refreshSession();
        navigate({ to: '/dashboard' });
      }
    } catch (err) {
      console.error('Login-Fehler:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Taskmanager</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Melden Sie sich an, um weiterzumachen.</p>
          </div>

          {/* Form */}
          <div className="p-6 text-gray-900 dark:text-gray-100">
            {/* Error Message */}
            {error() && (
              <div className="mb-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <AlertCircle size={20} className="text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error()}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Benutzername
                </label>
                <input
                  id="username"
                  type="text"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  placeholder="z.B. admin oder user"
                  disabled={isLoading()}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Passwort eingeben"
                  disabled={isLoading()}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading()}
                className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoading() ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>

            {/* Zugangsdaten */}
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-xs text-gray-600 font-medium mb-2">Test-Zugangsdaten:</p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span className="flex-1 rounded bg-gray-50 dark:bg-gray-900 px-2 py-1 font-mono">admin / admin</span>
                  <span className="text-gray-400 ml-2">(Admin-Rolle)</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex-1 rounded bg-gray-50 dark:bg-gray-900 px-2 py-1 font-mono">user / user</span>
                  <span className="text-gray-400 ml-2">(User-Rolle)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Server-Funktion:</strong> Das Passwort wird sicher auf dem Server validiert,
            nicht im Browser. Die Session-ID wird nur zum Client zurückgegeben.
          </p>
        </div>
      </div>
    </div>
  );
}
