/**
 * Auth Domain - Business Logic Services
 * 
 * Handles authentication operations: login, logout, session validation
 */

import { createSession, deleteSession, getSession } from '../session'

// Hardcoded test users (in production: from database)
const USERS = {
  admin: { id: '1', username: 'admin', password: 'admin', role: 'admin' },
  user: { id: '2', username: 'user', password: 'user', role: 'user' },
}

/**
 * Authenticates user with username/password
 * Returns session info or error
 */
export async function authenticateUser(input) {
  // Simulate authentication delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  // Find user
  const user = Object.values(USERS).find((u) => u.username === input.username)

  if (!user) {
    return { ok: false, error: 'Benutzer nicht gefunden' }
  }

  // Validate password
  if (user.password !== input.password) {
    return { ok: false, error: 'Passwort ungültig' }
  }

  // Create session
  const sessionId = createSession(user.id, user.username, user.role)

  return {
    ok: true,
    sessionId,
    username: user.username,
    role: user.role,
  }
}

/**
 * Ends user session
 */
export function endUserSession(sessionId) {
  if (sessionId) {
    deleteSession(sessionId)
  }

  return { ok: true }
}

/**
 * Validates and retrieves session info
 * Returns session data if valid, null if invalid
 */
export function validateSession(sessionId) {
  if (!sessionId) {
    return { ok: false, authenticated: false }
  }

  const session = getSession(sessionId)

  if (!session) {
    return { ok: false, authenticated: false }
  }

  return {
    ok: true,
    authenticated: true,
    sessionId,
    userId: session.userId,
    username: session.username,
    role: session.role,
  }
}
