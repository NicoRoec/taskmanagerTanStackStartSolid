import { createServerFn } from '@tanstack/react-start';
import { all, get, getDb, run } from './db';
import { getSessionInfo } from './auth-functions';

/**
 * TanStack Server Functions für Nutzerverwaltung
 * ==============================================
 *
 * Diese Funktionen laufen nur auf dem Server und greifen direkt
 * auf die SQLite-DB zu. Damit sind CRUD-Operationen geschützt und
 * können nicht vom Client manipuliert werden.
 */

async function requireAdmin(sessionId) {
  const session = await getSessionInfo({ data: { sessionId: sessionId || null } });

  if (!session?.authenticated) {
    return { ok: false, error: 'Nicht authentifiziert' };
  }

  if (session.role !== 'admin') {
    return { ok: false, error: 'Nur Admins erlaubt' };
  }

  return { ok: true, session };
}

export const getUsersForAdmin = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId);
    if (!auth.ok) return [];

    const db = await getDb();

    return all(
      db,
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.updated_at AS updatedAt,
         COUNT(t.id) AS tasksCount
       FROM users u
       LEFT JOIN tasks t
         ON lower(t.assigned_to) = lower(u.name)
        AND t.is_deleted = 0
       GROUP BY u.id, u.name, u.email, u.role, u.updated_at
       ORDER BY u.id ASC`
    );
  });

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId);
    if (!auth.ok) return { success: false, error: auth.error };

    const name = String(data?.name || '').trim();
    const email = String(data?.email || '').trim().toLowerCase();
    const role = String(data?.role || '').toLowerCase();

    if (!name) return { success: false, error: 'Name ist erforderlich' };
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Gültige E-Mail erforderlich' };
    }
    if (!['admin', 'user'].includes(role)) {
      return { success: false, error: 'Rolle ist ungültig' };
    }

    const db = await getDb();

    try {
      const result = await run(
        db,
        `INSERT INTO users (name, email, role, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        [name, email, role]
      );

      return { success: true, userId: result.lastID };
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE')) {
        return { success: false, error: 'E-Mail ist bereits vergeben' };
      }
      return { success: false, error: 'Nutzer konnte nicht angelegt werden' };
    }
  });

export const updateUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId);
    if (!auth.ok) return { success: false, error: auth.error };

    const userId = Number(data?.userId);
    const name = String(data?.name || '').trim();
    const email = String(data?.email || '').trim().toLowerCase();
    const role = String(data?.role || '').toLowerCase();

    if (!Number.isFinite(userId)) return { success: false, error: 'Ungültige Nutzer-ID' };
    if (!name) return { success: false, error: 'Name ist erforderlich' };
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Gültige E-Mail erforderlich' };
    }
    if (!['admin', 'user'].includes(role)) {
      return { success: false, error: 'Rolle ist ungültig' };
    }

    const db = await getDb();

    try {
      const existing = await get(db, `SELECT id, name FROM users WHERE id = ?`, [userId]);
      if (!existing) return { success: false, error: 'Nutzer nicht gefunden' };

      await run(
        db,
        `UPDATE users
         SET name = ?, email = ?, role = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [name, email, role, userId]
      );

      if (existing.name !== name) {
        await run(
          db,
          `UPDATE tasks
           SET assigned_to = ?, updated_at = datetime('now')
           WHERE lower(assigned_to) = lower(?)`,
          [name, existing.name]
        );
      }

      return { success: true };
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE')) {
        return { success: false, error: 'E-Mail ist bereits vergeben' };
      }
      return { success: false, error: 'Nutzer konnte nicht aktualisiert werden' };
    }
  });

export const deleteUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId);
    if (!auth.ok) return { success: false, error: auth.error };

    const userId = Number(data?.userId);
    if (!Number.isFinite(userId)) return { success: false, error: 'Ungültige Nutzer-ID' };

    const db = await getDb();

    try {
      const user = await get(db, `SELECT id, name FROM users WHERE id = ?`, [userId]);
      if (!user) return { success: false, error: 'Nutzer nicht gefunden' };

      await run(
        db,
        `UPDATE tasks
         SET assigned_to = 'Admin', updated_at = datetime('now')
         WHERE lower(assigned_to) = lower(?)`,
        [user.name]
      );

      await run(db, `DELETE FROM users WHERE id = ?`, [userId]);

      return { success: true };
    } catch {
      return { success: false, error: 'Nutzer konnte nicht gelöscht werden' };
    }
  });
