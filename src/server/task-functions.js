import { createServerFn } from '@tanstack/solid-start';
import { getDb, all, run, get } from './db';
import { getSessionInfo } from './auth-functions';

/**
 * TanStack Server Functions (Server-only)
 * =======================================
 * 
 * Diese Funktionen laufen ausschliesslich auf dem Server. Hier greifen wir
 * auf die SQLite-DB zu und fuehren den Ownership-Check durch. Dadurch kann
 * der Client keine SQL-Queries sehen oder umgehen.
 */

/**
 * Hole Tasks für die Hauptliste mit steuerbarem Filter UND Suchtext
 * 
 * TanStack Router + TanStack Search + TanStack Query:
 * ===================================================
 * Diese Server Function wird vom Client-Hook aufgerufen.
 * Der searchQuery Parameter kommt von der URL (TanStack Router Search).
 * 
 * Sichtbarkeits-Regeln (serverseitig durchgesetzt):
 * =================================================
 * 
 * filterType = "all":
 * - Admin: sieht ALLE non-deleted Tasks (is_deleted = 0)
 * - User: sieht ALLE non-deleted Tasks (is_deleted = 0)
 * 
 * filterType = "my":
 * - Admin: sieht NUR Tasks, die dem Admin zugewiesen sind (assigned_to = username)
 * - User: sieht NUR Tasks, die ihm zugewiesen sind (assigned_to = username)
 * 
 * searchQuery Parameter:
 * - Wenn vorhanden: Filtert per SQL LIKE auf Titel
 * - Case-insensitive Suche (z.B. "Mock" findet "Mockup")
 * - Funktioniert mit beiden Filtern (all + my)
 */
export const getTasksForList = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    // Keine Session = Keine Tasks
    if (!session?.authenticated) {
      return [];
    }

    const db = await getDb();
    const filterType = data.filterType || 'all'; // Default: "all"
    const searchQuery = data.searchQuery || ''; // Search-Query aus URL

    // ===== SUCHFILTER VORBEREITEN =====
    // Wenn Suchtext eingegeben: SQL LIKE für Title-Suche
    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (filterType === 'my') {
      whereClause += ' AND lower(assigned_to) = lower(?)';
      params.push(session.username);
    }

    // Suchtext (alle Spalten berücksichtigen)
    if (searchQuery.trim()) {
      whereClause += ' AND (lower(title) LIKE lower(?) OR lower(assigned_to) LIKE lower(?))';
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern);
    }

    return all(
      db,
      `SELECT id, title, status, priority, due_date AS dueDate, owner_id, assigned_to AS assignee
       FROM tasks
       ${whereClause}
       ORDER BY id ASC`,
      params
    );
  });

/**
 * Dashboard-Daten aus der Datenbank
 * =================================
 *
 * Liefert:
 * - Statistiken nach Status (Neu, in Arbeit, Erledigt)
 * - Kürzliche Aktivitäten (zuletzt aktualisierte Tasks)
 *
 * Sichtbarkeit:
 * - Admin: sieht alle nicht gelöschten Tasks
 * - User: sieht nur zugewiesene nicht gelöschte Tasks
 */
export const getDashboardData = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    if (!session?.authenticated) {
      return {
        stats: {
          open: 0,
          inProgress: 0,
          done: 0,
        },
        activities: [],
      };
    }

    const db = await getDb();

    let whereClause = 'WHERE is_deleted = 0';
    const params = [];

    if (session.role !== 'admin') {
      whereClause += ' AND lower(assigned_to) = lower(?)';
      params.push(session.username);
    }

    const statsRow = await get(
      db,
      `SELECT
         SUM(CASE WHEN status = 'Neu' THEN 1 ELSE 0 END) AS open,
         SUM(CASE WHEN status = 'in Arbeit' THEN 1 ELSE 0 END) AS inProgress,
         SUM(CASE WHEN status = 'Erledigt' THEN 1 ELSE 0 END) AS done
       FROM tasks
       ${whereClause}`,
      params
    );

    const activities = await all(
      db,
      `SELECT
         id,
         title,
         status,
         updated_at AS updatedAt
       FROM tasks
       ${whereClause}
       ORDER BY datetime(updated_at) DESC
       LIMIT 6`,
      params
    );

    return {
      stats: {
        open: Number(statsRow?.open || 0),
        inProgress: Number(statsRow?.inProgress || 0),
        done: Number(statsRow?.done || 0),
      },
      activities: activities || [],
    };
  });

/**
 * Erstelle eine neue Task
 * 
 * TanStack Server Function Boundary:
 * ==================================
 * - Client sendet: { sessionId, title, status, priority, dueDate, assignedTo }
 * - Diese Funktion laeuft NUR auf dem Server
 * - SQL-Query ist unsichtbar fuer den Client
 * - owner_id wird automatisch aus der Session gesetzt (User kann nicht manipulieren!)
 * - assigned_to wird vom Client gesetzt (wem die Task zugewiesen ist)
 * 
 * Autorisierung (Enforcement Point):
 * ==================================
 * - Admin: ALLES (normal)
 * - User: Kann NUR Tasks fuer sich selbst erstellen
 *   Der owner_id wird IMMER von session.userId genommen, nie vom Client!
 */
export const createTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    // ===== AUTHENTIFIZIERUNG =====
    // Keine Session? Zugriff verweigert.
    if (!session?.authenticated) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // ===== EINGABE-VALIDIERUNG =====
    const { title, status, priority, dueDate, assignedTo } = data;

    if (!title || !title.trim()) {
      return { success: false, error: 'Titel ist erforderlich' };
    }

    if (!status) {
      return { success: false, error: 'Status ist erforderlich' };
    }

    if (!priority) {
      return { success: false, error: 'Priorität ist erforderlich' };
    }

    if (!dueDate) {
      return { success: false, error: 'Fälligkeitsdatum ist erforderlich' };
    }

    // ===== DATENBANK-OPERATION =====
    const db = await getDb();

    try {
      const result = await run(
        db,
        `INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
        [
          title.trim(),
          status,
          priority,
          dueDate,
          Number(session.userId), // ===== KRITISCH: owner_id kommt aus Session, nicht vom Client! =====
          assignedTo || 'Admin', // assigned_to Wert vom Client (default: Admin)
        ]
      );

      return {
        success: true,
        taskId: result.lastID,
        message: 'Task erfolgreich erstellt',
      };
    } catch (error) {
      console.error('Fehler beim Erstellen der Task:', error);
      return {
        success: false,
        error: 'Task konnte nicht erstellt werden',
      };
    }
  });

/**
 * Aktualisiere eine existierende Task
 * 
 * TanStack Server Function Boundary:
 * ==================================
 * - Client sendet: { sessionId, taskId, title, status, priority, dueDate }
 * - Diese Funktion laeuft NUR auf dem Server
 * - Ownership-Check passiert hier (nicht im Client!)
 * 
 * Autorisierung (Enforcement Point):
 * ==================================
 * - Admin: Kann JEDE Task updaten
 * - User: Kann NUR ihre eigenen Tasks updaten
 *   Das wird serverseitig ueberprueft: owner_id == session.userId
 * 
 * Sicherheit:
 * ===========
 * - owner_id wird NICHT aktualisiert (Schutz vor Privilege Escalation)
 * - is_deleted bleibt unveraendert (nur delete-Funktion darf das aendern)
 */
export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    // ===== AUTHENTIFIZIERUNG =====
    if (!session?.authenticated) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // ===== EINGABE-VALIDIERUNG =====
    const { taskId, title, status, priority, dueDate, assignedTo } = data;

    if (!taskId) {
      return { success: false, error: 'Task-ID ist erforderlich' };
    }

    if (!title || !title.trim()) {
      return { success: false, error: 'Titel ist erforderlich' };
    }

    if (!status) {
      return { success: false, error: 'Status ist erforderlich' };
    }

    if (!priority) {
      return { success: false, error: 'Priorität ist erforderlich' };
    }

    if (!dueDate) {
      return { success: false, error: 'Fälligkeitsdatum ist erforderlich' };
    }

    // ===== DATENBANK-OPERATION & AUTORISIERUNG =====
    const db = await getDb();

    try {
      // Lade die Task, um Ownership zu pruefen
      const task = await get(
        db,
        'SELECT id, owner_id FROM tasks WHERE id = ? AND is_deleted = 0',
        [Number(taskId)]
      );

      // Task nicht gefunden?
      if (!task) {
        return { success: false, error: 'Task nicht gefunden' };
      }

      /**
       * Sicherheit: Geloeschte Tasks duerfen NICHT edited werden!
       * ==========================================================
       * 
       * Warum Server-Side Check?
       * ========================
       * Der Client koennte die is_deleted Flag ignorieren.
       * Deshalb pruefen wir auf dem Server: die Task muss is_deleted=0 sein.
       * 
       * Die WHERE-Klausel oben ("is_deleted = 0") erzwingt das:
       * Wenn Task geloesch (is_deleted=1), wird sie NICHT gefunden.
       * => Update schlaegt fehl (Safe by Default)
       * 
       * Grund: Geloeschte Tasks sind "archived" - nicht bearbeitbar.
       * Nur im Papierkorb sichtbar zur Restore/Delete.
       */

      // ===== OWNERSHIP CHECK (Autorisierung) =====
      // Admin darf alles, User nur ihre eigenen Tasks
      const isAdmin = session.role === 'admin';
      const isOwner = Number(task.owner_id) === Number(session.userId);

      if (!isAdmin && !isOwner) {
        // === SICHERHEIT: User versucht, fremde Task zu updaten ===
        console.error(
          `[SECURITY] User ${session.userId} tried to update task ${taskId} owned by ${task.owner_id}`
        );
        return { success: false, error: 'Berechtigung verweigert' };
      }

      // Update durchfuehren
      await run(
        db,
        `UPDATE tasks
         SET title = ?, status = ?, priority = ?, due_date = ?, assigned_to = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          title.trim(),
          status,
          priority,
          dueDate,
          data.assignedTo || 'Admin', // assigned_to aktualisierbar durch Admin
          Number(taskId),
        ]
      );

      return {
        success: true,
        message: 'Task erfolgreich aktualisiert',
      };
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Task:', error);
      return {
        success: false,
        error: 'Task konnte nicht aktualisiert werden',
      };
    }
  });

/**
 * Soft Delete - Task in den Papierkorb verschieben
 * 
 * TanStack Server Function Boundary:
 * ==================================
 * - Client sendet nur: { sessionId, taskId }
 * - Diese Funktion laeuft NUR auf dem Server
 * - is_deleted = 1 bedeutet "Soft Delete": Daten bleiben in der DB
 * 
 * Soft Delete Konzept:
 * ====================
 * Statt tatsaechlich zu loeschen setzen wir is_deleted = 1:
 * - Reversibel: Tasks koennen wiederhergestellt werden
 * - Audit-Trail: Wir wissen, dass die Task mal gab
 * - Performance: Keine komplexen Cascade-Deletes noetig
 * - Compliance: Manche Gesetze verlangen "Daten bleiben erhalten"
 * 
 * Autorisierung (Enforcement Point):
 * ==================================
 * - Admin: Kann JEDE Task loeschen
 * - User: Kann nur Tasks loeschen, die ihm zugewiesen sind
 */
export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    if (!session?.authenticated) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    const { taskId } = data;

    if (!taskId) {
      return { success: false, error: 'Task-ID ist erforderlich' };
    }

    const db = await getDb();

    try {
      // Lade Task, um Ownership zu pruefen
      const task = await get(
        db,
        'SELECT id, owner_id, assigned_to FROM tasks WHERE id = ? AND is_deleted = 0',
        [Number(taskId)]
      );

      if (!task) {
        return { success: false, error: 'Task nicht gefunden' };
      }

      // Zuweisungs-Check: Admin darf alles, User nur eigene Zuweisungen
      const isAdmin = session.role === 'admin';
      const isAssignee =
        String(task.assigned_to || '').toLowerCase() ===
        String(session.username || '').toLowerCase();

      if (!isAdmin && !isAssignee) {
        console.error(
          `[SECURITY] User ${session.userId} tried to delete task ${taskId} assigned to ${task.assigned_to}`
        );
        return { success: false, error: 'Berechtigung verweigert' };
      }

      // Soft Delete: Nur is_deleted setzen, nicht wirklich loeschen
      await run(
        db,
        `UPDATE tasks SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`,
        [Number(taskId)]
      );

      return { success: true, message: 'Task in Papierkorb verschoben' };
    } catch (error) {
      console.error('Fehler beim Loeschen der Task:', error);
      return { success: false, error: 'Task konnte nicht geloescht werden' };
    }
  });

/**
 * Hole alle gelöschten Tasks für die Papierkorb-View
 * 
 * TanStack Router + Loader:
 * =========================
 * Diese Funktion wird vom Loader der papierkorb.jsx Route aufgerufen:
 * 
 * export const Route = createFileRoute('/_layout/papierkorb')({
 *   loader: () => getTasksForTrash({ data: { sessionId } }),
 *   component: PapierkorbPage,
 * })
 * 
 * Der Loader laeuft VOR dem Render - dadurch sind Daten sofort im HTML!
 * Das ist wichtig fuer:
 * - SSR (Server-Side Rendering)
 * - Schnellere Seitenladung (keine spinner/loading states)
 * - Best SEO (Daten sind im Initial HTML)
 * 
 * Autorisierung:
 * ==============
 * - Admin: Sieht ALL geloesch tasks
 * - User: VOM PAPIERKORB: Sieht nur ihre geloesch eigenen (is_deleted=1 AND owner_id)
 *   Damit User sehen koennen, welche eigenen Tasks sie geloescht haben
 */
export const getTasksForTrash = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    if (!session?.authenticated) {
      return [];
    }

    const db = await getDb();

    if (session.role === 'admin') {
      return all(
        db,
        `SELECT id, title, status, priority, due_date AS dueDate, owner_id AS ownerId, assigned_to AS assignee, updated_at
         FROM tasks
         WHERE is_deleted = 1
         ORDER BY updated_at DESC`
      );
    }

    // User sieht nur ihre eigenen geloesch Tasks
    return all(
      db,
      `SELECT id, title, status, priority, due_date AS dueDate, owner_id AS ownerId, assigned_to AS assignee, updated_at
       FROM tasks
       WHERE is_deleted = 1 AND owner_id = ?
       ORDER BY updated_at DESC`,
      [Number(session.userId)]
    );
  });

/**
 * Permanent Delete - Task unwiderruflich aus der DB entfernen
 * 
 * Achtung: KEINE WIEDERHERSTELLUNG möglich!
 * ==========================================
 * Dies ist das "endgültige" Löschen. Gegensatz zu Soft Delete (is_deleted=1).
 * 
 * Wer darf permanent loeschen?
 * ============================
 * Nur Admin! User duerfen ihre geloesch Tasks nicht endgueltig loeschen.
 * (Dadurch haben Admins noch Kontrol, falls User etwas versehentlich loescht)
 * 
 * TanStack Server Function Security:
 * ===================================
 * Der Authorization-Check passiert hier auf dem Server.
 * Der Client kann die Permission nicht umgehen!
 */
export const permanentlyDeleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    if (!session?.authenticated) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // Nur Admins duerfen permanent loeschen
    if (session.role !== 'admin') {
      console.error(`[SECURITY] User ${session.userId} tried to permanently delete task`);
      return { success: false, error: 'Nur Admins duerfen endgueltig loeschen' };
    }

    const { taskId } = data;

    if (!taskId) {
      return { success: false, error: 'Task-ID ist erforderlich' };
    }

    const db = await getDb();

    try {
      // Vorsicht: Fuer permanent delete spielen Ownership-Rules keine Rolle
      // Admin kann JEDE Task endgueltig loeschen
      await run(
        db,
        `DELETE FROM tasks WHERE id = ? AND is_deleted = 1`,
        [Number(taskId)]
      );

      return { success: true, message: 'Task endgueltig geloescht' };
    } catch (error) {
      console.error('Fehler beim permanenten Loeschen:', error);
      return { success: false, error: 'Task konnte nicht geloescht werden' };
    }
  });

/**
 * Restore - Task aus Papierkorb wiederherstellen
 * 
 * Soft Delete Reverse:
 * ====================
 * Gegensatz zu deleteTask() - wir setzen is_deleted = 0
 * Damit ist die Task wieder in der Hauptliste sichtbar.
 * 
 * Ownership (nur fuer User):
 * ==========================
 * - Admin: Kann JEDE Task wiederherstellen
 * - User: Kann sich nur ihre EIGENEN tasks aus dem Papierkorb holen
 */
export const restoreTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getSessionInfo({ data: { sessionId: data.sessionId || null } });

    if (!session?.authenticated) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    const { taskId } = data;

    if (!taskId) {
      return { success: false, error: 'Task-ID ist erforderlich' };
    }

    const db = await getDb();

    try {
      // Lade gelosch Task, um Ownership zu pruefen
      const task = await get(
        db,
        'SELECT id, owner_id FROM tasks WHERE id = ? AND is_deleted = 1',
        [Number(taskId)]
      );

      if (!task) {
        return { success: false, error: 'Task nicht im Papierkorb' };
      }

      // Ownership Check
      const isAdmin = session.role === 'admin';
      const isOwner = Number(task.owner_id) === Number(session.userId);

      if (!isAdmin && !isOwner) {
        console.error(
          `[SECURITY] User ${session.userId} tried to restore task ${taskId} owned by ${task.owner_id}`
        );
        return { success: false, error: 'Berechtigung verweigert' };
      }

      // Restore: is_deleted = 0
      await run(
        db,
        `UPDATE tasks SET is_deleted = 0, updated_at = datetime('now') WHERE id = ?`,
        [Number(taskId)]
      );

      return { success: true, message: 'Task wiederhergestellt' };
    } catch (error) {
      console.error('Fehler beim Wiederherstellen:', error);
      return { success: false, error: 'Task konnte nicht wiederhergestellt werden' };
    }
  });
