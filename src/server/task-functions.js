import { createServerFn } from '@tanstack/solid-start'
import { getDb } from './db'
import { getSessionInfo } from './auth-functions'
import {
  fetchDashboardData,
  fetchTasksForList,
  fetchTrashTasks,
  insertTask,
  permanentlyDeleteTaskById,
  restoreTaskById,
  softDeleteTaskById,
  updateTaskById,
} from './domain/tasks/services'
import {
  validateCreateTaskInput,
  validateTaskIdInput,
  validateTaskListInput,
  validateUpdateTaskInput,
} from './domain/tasks/validators'

async function getAuthenticatedSession(sessionId) {
  const session = await getSessionInfo({ data: { sessionId: sessionId || null } })
  if (!session?.authenticated) return null
  return session
}

export const getTasksForList = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return []

    const validated = validateTaskListInput(data)
    if (!validated.ok) return []

    const db = await getDb()
    return fetchTasksForList(db, session, validated.value)
  })

export const getDashboardData = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) {
      return {
        stats: { open: 0, inProgress: 0, done: 0 },
        activities: [],
      }
    }

    const db = await getDb()
    return fetchDashboardData(db, session)
  })

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return { success: false, error: 'Nicht authentifiziert' }

    const validated = validateCreateTaskInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const taskId = await insertTask(db, session, validated.value)
      return { success: true, taskId, message: 'Task erfolgreich erstellt' }
    } catch (error) {
      console.error('Fehler beim Erstellen der Task:', error)
      return { success: false, error: 'Task konnte nicht erstellt werden' }
    }
  })

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return { success: false, error: 'Nicht authentifiziert' }

    const validated = validateUpdateTaskInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const updated = await updateTaskById(db, session, validated.value)
      if (!updated.ok) return { success: false, error: updated.error }
      return { success: true, message: 'Task erfolgreich aktualisiert' }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Task:', error)
      return { success: false, error: 'Task konnte nicht aktualisiert werden' }
    }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return { success: false, error: 'Nicht authentifiziert' }

    const validated = validateTaskIdInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const deleted = await softDeleteTaskById(db, session, validated.value.taskId)
      if (!deleted.ok) return { success: false, error: deleted.error }
      return { success: true, message: 'Task in Papierkorb verschoben' }
    } catch (error) {
      console.error('Fehler beim Löschen der Task:', error)
      return { success: false, error: 'Task konnte nicht gelöscht werden' }
    }
  })

export const getTasksForTrash = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return []

    const db = await getDb()
    return fetchTrashTasks(db, session)
  })

export const permanentlyDeleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return { success: false, error: 'Nicht authentifiziert' }
    if (session.role !== 'admin') return { success: false, error: 'Nur Admins dürfen endgültig löschen' }

    const validated = validateTaskIdInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      await permanentlyDeleteTaskById(db, validated.value.taskId)
      return { success: true, message: 'Task endgültig gelöscht' }
    } catch (error) {
      console.error('Fehler beim permanenten Löschen:', error)
      return { success: false, error: 'Task konnte nicht gelöscht werden' }
    }
  })

export const restoreTask = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const session = await getAuthenticatedSession(data?.sessionId)
    if (!session) return { success: false, error: 'Nicht authentifiziert' }

    const validated = validateTaskIdInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const restored = await restoreTaskById(db, session, validated.value.taskId)
      if (!restored.ok) return { success: false, error: restored.error }
      return { success: true, message: 'Task wiederhergestellt' }
    } catch (error) {
      console.error('Fehler beim Wiederherstellen:', error)
      return { success: false, error: 'Task konnte nicht wiederhergestellt werden' }
    }
  })
