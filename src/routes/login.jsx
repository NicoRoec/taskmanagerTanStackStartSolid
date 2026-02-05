import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { AlertCircle } from 'lucide-react';
import { loginUser } from '../server/auth-functions';
import { useAuth } from './__root';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * TanStack Form
   * ============================
   * 
   * TanStack Form ist eine headless Formular-Bibliothek. „Headless“ bedeutet:
   * Sie liefert nur Logik (State, Validierung, Submit), aber kein UI. Das UI
   * gestalten wir selbst mit Tailwind – so bleibt das Design flexibel.
   * 
   * Warum nutzen wir TanStack Form?
   * ------------------------------------------
   * - Zentrale, vorhersehbare Form-Logik (keine verteilten useState-Handler)
   * - Eingebaute Validierung pro Feld + saubere Fehlerzustände
   * - Einheitlicher Submit-Flow (async/await) mit Loading-Zustand
   * - Skalierbar für größere Formulare mit vielen Feldern
   * - Headless => passt perfekt zu unserem Tailwind-Design
   * 
   * Wie funktioniert TanStack Form?
   * -------------------------------
   * 1) useForm() erzeugt einen Form-Controller mit defaultValues.
   * 2) Jedes Feld wird über <form.Field> registriert (Name + Validierung).
   * 3) form.handleSubmit() sammelt Werte + validiert, dann ruft es onSubmit auf.
   * 4) onSubmit führt die Server Function aus (Login) und verarbeitet das Ergebnis.
   */
  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError('');
      setIsLoading(true);

      try {
        // Rufe Server Function auf - diese läuft NUR auf dem Server!
        const result = await loginUser({
          data: { username: value.username, password: value.password },
        });

        if (!result.success) {
          setError(result.error || 'Login fehlgeschlagen');
          setIsLoading(false);
          return;
        }

        // Erfolgreicher Login: Speichere Session-ID
        if (result.sessionId) {
          // Session wird in einem Cookie gespeichert
          document.cookie = `task_session=${encodeURIComponent(result.sessionId)}; path=/; samesite=lax`;
          
          // Aktualisiere Auth-Context (Server prüft Cookie)
          await refreshSession();
          
          // Navigiere zum Dashboard
          navigate({ to: '/dashboard' });
        }
      } catch (err) {
        console.error('Login-Fehler:', err);
        setError('Ein unerwarteter Fehler ist aufgetreten');
      } finally {
        setIsLoading(false);
      }
    },
  });

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
    form.handleSubmit();
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl border border-blue-200 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Taskmanager</h1>
            <p className="text-blue-100 mt-2 text-sm">Melden Sie sich an um weiterzumachen</p>
          </div>

          {/* Form */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex gap-3">
                <AlertCircle size={20} className="text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <form.Field
                name="username"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Bitte Benutzername eingeben' : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                      Benutzername
                    </label>
                    <input
                      id={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="z.B. admin oder user"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      required
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              {/* Password */}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Bitte Passwort eingeben' : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                      Passwort
                    </label>
                    <input
                      id={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Passwort eingeben"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      required
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
              >
                {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-600 font-medium mb-2">Test-Zugangsdaten:</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-50 px-2 py-1 rounded flex-1">admin / admin</span>
                  <span className="text-gray-400 ml-2">(Admin-Rolle)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-50 px-2 py-1 rounded flex-1">user / user</span>
                  <span className="text-gray-400 ml-2">(User-Rolle)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Server-Funktion Demo:</strong> Das Passwort wird sicher auf dem Server validiert,
            nicht im Browser. Die Session-ID wird nur zum Client zurückgegeben.
          </p>
        </div>
      </div>
    </div>
  );
}
