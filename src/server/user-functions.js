import { createServerFn } from '@tanstack/solid-start'
import { getDb } from './db'
import { getSessionInfo } from './auth-functions'
import {
  deleteUserById,
  fetchUsersForAdmin,
  insertUser,
  updateUserById,
} from './domain/users/services'
import {
  validateCreateUserInput,
  validateDeleteUserInput,
  validateUpdateUserInput,
} from './domain/users/validators'

async function requireAdmin(sessionId) {
  const session = await getSessionInfo({ data: { sessionId: sessionId || null } })

  if (!session?.authenticated) {
    return { ok: false, error: 'Nicht authentifiziert' }
  }

  if (session.role !== 'admin') {
    return { ok: false, error: 'Nur Admins erlaubt' }
  }

  return { ok: true, session }
}

export const getUsersForAdmin = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId)
    if (!auth.ok) return []

    const db = await getDb()
    return fetchUsersForAdmin(db)
  })

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId)
    if (!auth.ok) return { success: false, error: auth.error }

    const validated = validateCreateUserInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const userId = await insertUser(db, validated.value)
      return { success: true, userId }
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE')) {
        return { success: false, error: 'E-Mail ist bereits vergeben' }
      }
      return { success: false, error: 'Nutzer konnte nicht angelegt werden' }
    }
  })

export const updateUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId)
    if (!auth.ok) return { success: false, error: auth.error }

    const validated = validateUpdateUserInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const updated = await updateUserById(db, validated.value)
      if (!updated.ok) return { success: false, error: updated.error }
      return { success: true }
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE')) {
        return { success: false, error: 'E-Mail ist bereits vergeben' }
      }
      return { success: false, error: 'Nutzer konnte nicht aktualisiert werden' }
    }
  })

export const deleteUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const auth = await requireAdmin(data?.sessionId)
    if (!auth.ok) return { success: false, error: auth.error }

    const validated = validateDeleteUserInput(data)
    if (!validated.ok) return { success: false, error: validated.error }

    const db = await getDb()

    try {
      const deleted = await deleteUserById(db, validated.value.userId)
      if (!deleted.ok) return { success: false, error: deleted.error }
      return { success: true }
    } catch {
      return { success: false, error: 'Nutzer konnte nicht gelöscht werden' }
    }
  })
