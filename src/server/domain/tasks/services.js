import { all, get, run } from '../../db'

export async function fetchTasksForList(db, session, input) {
  let whereClause = 'WHERE is_deleted = 0'
  const params = []

  if (input.filterType === 'my') {
    whereClause += ' AND lower(assigned_to) = lower(?)'
    params.push(session.username)
  }

  if (input.searchQuery.trim()) {
    whereClause += ' AND (lower(title) LIKE lower(?) OR lower(assigned_to) LIKE lower(?))'
    const searchPattern = `%${input.searchQuery}%`
    params.push(searchPattern, searchPattern)
  }

  return all(
    db,
    `SELECT id, title, status, priority, due_date AS dueDate, owner_id, assigned_to AS assignee
     FROM tasks
     ${whereClause}
     ORDER BY id ASC`,
    params,
  )
}

export async function fetchDashboardData(db, session) {
  let whereClause = 'WHERE is_deleted = 0'
  const params = []

  if (session.role !== 'admin') {
    whereClause += ' AND lower(assigned_to) = lower(?)'
    params.push(session.username)
  }

  const statsRow = await get(
    db,
    `SELECT
       SUM(CASE WHEN lower(status) = 'neu' THEN 1 ELSE 0 END) AS open,
       SUM(CASE WHEN lower(status) = 'in arbeit' THEN 1 ELSE 0 END) AS inProgress,
       SUM(CASE WHEN lower(status) = 'erledigt' THEN 1 ELSE 0 END) AS done
     FROM tasks
     ${whereClause}`,
    params,
  )

  const activities = await all(
    db,
    `SELECT id, title, status, updated_at AS updatedAt
     FROM tasks
     ${whereClause}
     ORDER BY datetime(updated_at) DESC
     LIMIT 6`,
    params,
  )

  return {
    stats: {
      open: Number(statsRow?.open || 0),
      inProgress: Number(statsRow?.inProgress || 0),
      done: Number(statsRow?.done || 0),
    },
    activities: activities || [],
  }
}

export async function insertTask(db, session, input) {
  const result = await run(
    db,
    `INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [
      input.title,
      input.status,
      input.priority,
      input.dueDate,
      Number(session.userId),
      input.assignedTo,
    ],
  )

  return result.lastID
}

export async function updateTaskById(db, session, input) {
  const task = await get(
    db,
    'SELECT id, owner_id FROM tasks WHERE id = ? AND is_deleted = 0',
    [input.taskId],
  )

  if (!task) {
    return { ok: false, error: 'Task nicht gefunden' }
  }

  const isAdmin = session.role === 'admin'
  const isOwner = Number(task.owner_id) === Number(session.userId)
  if (!isAdmin && !isOwner) {
    return { ok: false, error: 'Berechtigung verweigert' }
  }

  await run(
    db,
    `UPDATE tasks
     SET title = ?, status = ?, priority = ?, due_date = ?, assigned_to = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [input.title, input.status, input.priority, input.dueDate, input.assignedTo, input.taskId],
  )

  return { ok: true }
}

export async function softDeleteTaskById(db, session, taskId) {
  const task = await get(
    db,
    'SELECT id, owner_id, assigned_to FROM tasks WHERE id = ? AND is_deleted = 0',
    [taskId],
  )

  if (!task) {
    return { ok: false, error: 'Task nicht gefunden' }
  }

  const isAdmin = session.role === 'admin'
  const isAssignee = String(task.assigned_to || '').toLowerCase() === String(session.username || '').toLowerCase()

  if (!isAdmin && !isAssignee) {
    return { ok: false, error: 'Berechtigung verweigert' }
  }

  await run(db, `UPDATE tasks SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`, [taskId])
  return { ok: true }
}

export async function fetchTrashTasks(db, session) {
  if (session.role === 'admin') {
    return all(
      db,
      `SELECT id, title, status, priority, due_date AS dueDate, owner_id AS ownerId, assigned_to AS assignee, updated_at
       FROM tasks
       WHERE is_deleted = 1
       ORDER BY updated_at DESC`,
    )
  }

  return all(
    db,
    `SELECT id, title, status, priority, due_date AS dueDate, owner_id AS ownerId, assigned_to AS assignee, updated_at
     FROM tasks
     WHERE is_deleted = 1 AND owner_id = ?
     ORDER BY updated_at DESC`,
    [Number(session.userId)],
  )
}

export async function permanentlyDeleteTaskById(db, taskId) {
  await run(db, `DELETE FROM tasks WHERE id = ? AND is_deleted = 1`, [taskId])
}

export async function restoreTaskById(db, session, taskId) {
  const task = await get(
    db,
    'SELECT id, owner_id FROM tasks WHERE id = ? AND is_deleted = 1',
    [taskId],
  )

  if (!task) {
    return { ok: false, error: 'Task nicht im Papierkorb' }
  }

  const isAdmin = session.role === 'admin'
  const isOwner = Number(task.owner_id) === Number(session.userId)
  if (!isAdmin && !isOwner) {
    return { ok: false, error: 'Berechtigung verweigert' }
  }

  await run(db, `UPDATE tasks SET is_deleted = 0, updated_at = datetime('now') WHERE id = ?`, [taskId])
  return { ok: true }
}
