/**
 * TanStack Server Functions für Authentifizierung
 * ================================================
 * 
 * WAS SIND TANSTACK SERVER FUNCTIONS?
 * ===================================
 * 
 * TanStack Server Functions sind TypeScript/JavaScript Funktionen, die
 * AUSSCHLIESSLICH auf dem Server ausgeführt werden. Sie ermöglichen es dir:
 * 
 * 1. **Backend-Code direkt von Komponenten aufzurufen**
 *    - Kein API-Request schreiben oder Endpoint definieren nötig
 *    - Nur die Funktion aufrufen - der Rest wird automatisch gehandhabt
 * 
 * 2. **Type-Safety von End-zu-End**
 *    - TypeScript-Typen werden vom Server zum Client synchronisiert
 *    - Intellisense funktioniert perfekt
 *    - Fehler werden zur Compile-Time erkannt, nicht Runtime
 * 
 * 3. **Sichere Operationen auf dem Server auszuführen**
 *    - Datenbankzugriffe
 *    - Authentifizierung
 *    - Autorisierung
 *    - Datei-Operationen
 *    - API-Keys und Secrets (nie zum Client)
 * 
 * Beispiel:
 * ```
 * // Server-Funktion (läuft nur auf dem Server)
 * export const server_loginUser = 'server' ? (username: string, password: string) => {
 *   // Hier kannst du Datenbank-Abfragen machen, ohne dass Client-Code das sieht
 *   const user = validateCredentials(username, password)
 *   return createSession(user)
 * } : undefined
 * 
 * // Client-Komponente (läuft nur im Browser)
 * const session = await server_loginUser(username, password)
 * ```
 * 
 * WARUM AUTHENTIFIZIERUNG AUF DEM SERVER?
 * =======================================
 * 
 * 1. **Sicherheit**
 *    - Passwörter dürfen niemals zum Client übertragen werden
 *    - Der Client kann nicht vertraut werden (Code ist sichtbar/modifizierbar)
 *    - Auf dem Server kannst du geheime Validierungen durchführen
 * 
 * 2. **Datenbankzugriff**
 *    - Nur der Server hat Zugriff auf die Datenbank
 *    - Der Client kann keine Datenbank-Queries direkt ausführen
 * 
 * 3. **Sessions verwalten**
 *    - Session-Daten müssen auf dem Server "vertraut" sein
 *    - Cookies mit HttpOnly-Flag können nur vom Server gelesen/geschrieben werden
 *    - Der Client kann sie nicht modifizieren
 * 
 * 4. **Rate-Limiting & Brute-Force-Schutz**
 *    - Der Server kann Login-Versuche zählen und IP-Adressen prüfen
 *    - Das ist clientseitig nicht möglich
 * 
 * Vergleich: Client vs Server Authentifizierung
 * =============================================
 * 
 * ❌ FALSCH (Unsicher): Client-seitige Auth
 * ```javascript
 * if (username === 'admin' && password === 'admin') {
 *   localStorage.setItem('authenticated', 'true')
 * }
 * // Problem: Jeder kann localStorage ändern und ist plötzlich "admin"
 * ```
 * 
 * ✅ RICHTIG (Sicher): Server-seitige Auth
 * ```javascript
 * // Server Function
 * const sessionId = await server_loginUser(username, password)
 * // Server validiert Passwort, erstellt sichere Session
 * // sessionId wird in HttpOnly Cookie gespeichert (Client kann nicht ändern)
 * ```
 */

import { createServerFn } from '@tanstack/react-start';
import { createSession, deleteSession, getSession } from './session';

/**
 * Hardcodierte Test-Benutzer
 * In einer echten Anwendung: Aus Datenbank laden
 */
const USERS = {
  admin: { id: '1', username: 'admin', password: 'admin', role: 'admin' as const },
  user: { id: '2', username: 'user', password: 'user', role: 'user' as const },
};

/**
 * Server-Funktion: Login (TanStack Server Function)
 * 
 * - Läuft NUR auf dem Server
 * - Validiert Benutzerdaten
 * - Erstellt eine Session
 * - Gibt Session-ID zurück (Client setzt Cookie)
 * - Passwort wird NIEMALS zum Client übertragen
 */
export const loginUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { username, password } = data;

    // Simuliere Authentifizierungsverzögerung
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Finde Benutzer
    const user = Object.values(USERS).find((u) => u.username === username);

    if (!user) {
      return { success: false, error: 'Benutzer nicht gefunden' } as const;
    }

    // Validiere Passwort
    if (user.password !== password) {
      return { success: false, error: 'Passwort ungültig' } as const;
    }

    // Erstelle Session
    const sessionId = createSession(user.id, user.username, user.role);

    return {
      success: true,
      sessionId,
      username: user.username,
      role: user.role,
    } as const;
  });

/**
 * Server-Funktion: Logout
 * 
 * - Läuft NUR auf dem Server
 * - Löscht die Session vom Server
 * - Client löscht den Cookie
 */
export const logoutUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string | null }) => data)
  .handler(async ({ data }) => {
    const { sessionId } = data;
    if (sessionId) {
      deleteSession(sessionId);
    }
    return { success: true } as const;
  });

/**
 * Server-Funktion: Session abrufen
 * 
 * - Läuft NUR auf dem Server
 * - Wird beim App-Start aufgerufen um aktuelle Session zu laden
 * - Prüft ob Session noch gültig ist
 * - Liest Session-ID aus Cookie
 */
export const getSessionInfo = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string | null }) => data)
  .handler(async ({ data }) => {
    const { sessionId } = data;

    if (!sessionId) {
      return { authenticated: false } as const;
    }

    const session = getSession(sessionId);

    if (!session) {
      return { authenticated: false } as const;
    }

    return {
      authenticated: true,
      sessionId,
      userId: session.userId,
      username: session.username,
      role: session.role,
    } as const;
  });
