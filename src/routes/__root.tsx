import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createContext, useContext, useState, useEffect } from "react";
import { useStore } from "@tanstack/react-store";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import * as TanstackQuery from "../integrations/tanstack-query/root-provider";

import StoreDevtools from "../lib/demo-store-devtools";
import { 
  themeStore, 
  initializeThemeStore, 
  toggleDarkMode,
  watchSystemThemePreference
} from "../lib/theme-store";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
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
  const isDarkMode = useStore(themeStore, (state) => state.darkMode)

  return {
    isDarkMode,
    toggleTheme: toggleDarkMode,
  }
}


export interface AuthContextType {
  session: {
    sessionId: string;
    userId: string;
    username: string;
    role: "admin" | "user";
  } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb des AuthProvider verwendet werden");
  }
  return context;
}

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({
    session: null,
    isAuthenticated: false,
    isAdmin: false,
    logout: async () => {},
    refreshSession: async () => {},
  });

  function getSessionIdFromCookie() {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("task_session="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  }

  // Beim Komponenten-Mount: Versuche, gespeicherte Session zu laden
  useEffect(() => {
    refreshSession();
  }, []);

  async function refreshSession() {
    try {
      // Wichtig: Session wird SERVER-seitig validiert (Cookie -> Server Function)
      const sessionId = getSessionIdFromCookie();
      const result = await getSessionInfo({ data: { sessionId } });

      if (!result?.authenticated) {
        setAuthState({
          session: null,
          isAuthenticated: false,
          isAdmin: false,
          logout: handleLogout,
          refreshSession,
        });
        return;
      }

      setAuthState({
        session: {
          sessionId: result.sessionId,
          userId: result.userId,
          username: result.username,
          role: result.role,
        },
        isAuthenticated: true,
        isAdmin: result.role === "admin",
        logout: handleLogout,
        refreshSession,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Session:", error);
      setAuthState({
        session: null,
        isAuthenticated: false,
        isAdmin: false,
        logout: handleLogout,
        refreshSession,
      });
    }
  }

  async function handleLogout() {
    try {
      const sessionId = getSessionIdFromCookie();
      await logoutUser({ data: { sessionId } });
      document.cookie = "task_session=; Max-Age=0; path=/; samesite=lax";
      setAuthState({
        session: null,
        isAuthenticated: false,
        isAdmin: false,
        logout: handleLogout,
        refreshSession,
      });
      // Navigation zu Login-Seite erfolgt in _layout.jsx
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  }

  const value: AuthContextType = {
    ...authState,
    logout: handleLogout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    initializeThemeStore();
    watchSystemThemePreference();
  }, []);

  return (
    <html lang="en" className={isDarkMode ? 'dark' : ''}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/*
          TanStack Query Provider
          =======================
          Der Provider stellt den QueryClient im React-Context bereit.
          Ohne ihn koennen useQuery/useMutation nicht arbeiten und
          liefern keine Daten.
        */}
        <TanstackQuery.Provider queryClient={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </TanstackQuery.Provider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
            StoreDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
