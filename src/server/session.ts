/**
 * Einfaches Session-Management für Authentifizierung
 * ====================================================
 * 
 * WICHTIG: Dies ist eine einfache, In-Memory-Implementierung für Lernzwecke.
 * In einer Produktionsanwendung würde man:
 * - Secure HTTP-Only Cookies verwenden
 * - Daten in einer Datenbank speichern
 * - JWT oder Session-Tokens mit Expiration nutzen
 * - Sicherheitsfeatures wie CSRF-Schutz implementieren
 * 
 * In dieser Implementierung verwenden wir:
 * - Ein einfaches Objekt, das Session-Daten speichert
 * - Session-IDs als Keys
 * - Benutzerdaten (id, username, role) als Values
 */

// In-Memory Speicher für Sessions
// In Produktion: Externe Session-Store (Redis, DB, etc.)
const sessions = new Map<string, SessionData>();

export interface SessionData {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: number;
}

/**
 * Generiert eine zufällige Session-ID
 * In Produktion: crypto.randomUUID() oder ähnlich
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Erstellt eine neue Session und speichert sie
 */
export function createSession(userId: string, username: string, role: 'admin' | 'user'): string {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId,
    username,
    role,
    createdAt: Date.now(),
  });
  return sessionId;
}

/**
 * Ruft Session-Daten anhand der Session-ID auf
 */
export function getSession(sessionId: string): SessionData | null {
  return sessions.get(sessionId) || null;
}

/**
 * Löscht eine Session (Logout)
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Listet alle aktiven Sessions auf (für Debugging)
 */
export function getAllSessions(): Map<string, SessionData> {
  return sessions;
}
