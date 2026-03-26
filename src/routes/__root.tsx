import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/solid-router";
import { Suspense, createContext, onMount, useContext } from "solid-js";
import { createSignal } from "solid-js";
import { HydrationScript } from "solid-js/web";

import * as TanstackQuery from "../integrations/tanstack-query/root-provider";

import {
  themeStore,
  initializeThemeStore,
  toggleDarkMode,
  watchSystemThemePreference,
} from "../lib/theme-store";

import appCss from "../styles.css?url";

import { getSessionInfo, logoutUser } from "../server/auth-functions";

/**
 * Authentifizierungs-Kontext für die gesamte Anwendung
 * ===================================================
 *
 * Mit React Context können wir Session-Informationen (Benutzer, Rolle)
 * für alle Komponenten verfügbar machen, ohne Props "weiterzureichen".
 *
 * Das ist nützlich für:
 * - Überprüfung der Benutzerrolle (admin vs user)
 * - Anzeigen des Benutzernamens im Header
 * - Bedingte Rendering von Admin-Funktionen
 * - Route-Guards in TanStack Router
 */

/**
 * Theme-Hook für Dark Mode
 * ========================
 *
 * Erlaubt alle Komponenten, den aktuellen Theme-Status zu lesen
 * und zwischen Light/Dark Mode umzuschalten.
 *
 * Verwendung in Komponenten:
 * -------------------------
 * const { isDarkMode, toggleTheme } = useTheme()
 *
 * // Liest aktuellen Dark Mode Status
 * console.log(isDarkMode)
 *
 * // Toggelt Dark Mode an/aus
 * onClick={() => toggleTheme()}
 */
export function useTheme() {
  return {
    isDarkMode: themeStore.state.darkMode,
    toggleTheme: toggleDarkMode,
  };
}

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb des AuthProvider verwendet werden");
  }
  return context;
}

export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Taskmanager",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  loader: async () => {
    // Beim Start: Versuche, die aktuelle Session zu laden
    // Dies wird vom AuthProvider gelesen
    return {};
  },
});

/**
 * AuthProvider - Wrapper-Komponente für Authentifizierung
 * ========================================================
 *
 * Der AuthProvider lädt beim App-Start die bestehende Session
 * und stellt sie allen Kind-Komponenten über Context zur Verfügung.
 *
 * Das passiert:
 * 1. RootDocument rendert als erstes
 * 2. AuthProvider wird initialisiert
 * 3. AuthProvider versucht Session zu laden (mit useEffect)
 * 4. Alle Kind-Komponenten können useAuth() Hook verwenden
 */
function AuthProvider(props) {
  const [session, setSession] = createSignal(null);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isAdmin, setIsAdmin] = createSignal(false);

  function getSessionIdFromCookie() {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("task_session="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  }

  async function refreshSession() {
    try {
      const sessionId = getSessionIdFromCookie();
      const result = await getSessionInfo({ data: { sessionId } });
      if (!result?.authenticated) {
        setSession(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        return;
      }
      setSession({
        sessionId: result.sessionId,
        userId: result.userId,
        username: result.username,
        role: result.role,
      });
      setIsAuthenticated(true);
      setIsAdmin(result.role === "admin");
    } catch (error) {
      console.error("Fehler beim Laden der Session:", error);
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }

  async function handleLogout() {
    try {
      const sessionId = getSessionIdFromCookie();
      await logoutUser({ data: { sessionId } });
      document.cookie = "task_session=; Max-Age=0; path=/; samesite=lax";
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      // Navigation zu Login-Seite erfolgt in _layout.jsx
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  }

  onMount(() => {
    refreshSession();
  });

  const value = {
    get session() {
      return session();
    },
    get isAuthenticated() {
      return isAuthenticated();
    },
    get isAdmin() {
      return isAdmin();
    },
    logout: handleLogout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}

function RootDocument(props) {
  const queryClient = TanstackQuery.getContext().queryClient;
  const { isDarkMode } = useTheme();

  onMount(() => {
    initializeThemeStore();
    watchSystemThemePreference();
  });

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        <TanstackQuery.Provider queryClient={queryClient}>
          <AuthProvider>
            <Suspense>{props.children}</Suspense>
          </AuthProvider>
        </TanstackQuery.Provider>
        <Scripts />
      </body>
    </html>
  );
}
