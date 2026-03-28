import { all, get, run } from '../../db'

export async function fetchUsersForAdmin(db) {
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
     ORDER BY u.id ASC`,
  )
}

export async function insertUser(db, input) {
  const result = await run(
    db,
    `INSERT INTO users (name, email, role, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    [input.name, input.email, input.role],
  )
  return result.lastID
}

export async function updateUserById(db, input) {
  const existing = await get(db, `SELECT id, name FROM users WHERE id = ?`, [input.userId])
  if (!existing) {
    return { ok: false, error: 'Nutzer nicht gefunden' }
  }

  await run(
    db,
    `UPDATE users
     SET name = ?, email = ?, role = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [input.name, input.email, input.role, input.userId],
  )

  if (existing.name !== input.name) {
    await run(
      db,
      `UPDATE tasks
       SET assigned_to = ?, updated_at = datetime('now')
       WHERE lower(assigned_to) = lower(?)`,
      [input.name, existing.name],
    )
  }

  return { ok: true }
}

export async function deleteUserById(db, userId) {
  const user = await get(db, `SELECT id, name FROM users WHERE id = ?`, [userId])
  if (!user) {
    return { ok: false, error: 'Nutzer nicht gefunden' }
  }

  await run(
    db,
    `UPDATE tasks
     SET assigned_to = 'Admin', updated_at = datetime('now')
     WHERE lower(assigned_to) = lower(?)`,
    [user.name],
  )

  await run(db, `DELETE FROM users WHERE id = ?`, [userId])
  return { ok: true }
}
