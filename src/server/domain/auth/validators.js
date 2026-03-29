/**
 * Auth Domain - Input Validators
 * 
 * Validates login input before passing to services
 */

export function validateLoginInput(data) {
  if (!data) {
    return { ok: false, error: 'Keine Daten gefunden' }
  }

  const { username, password } = data

  // Username validation
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return { ok: false, error: 'Benutzername erforderlich' }
  }

  if (username.trim().length < 1) {
    return { ok: false, error: 'Benutzername mindestens 1 Zeichen' }
  }

  if (username.trim().length > 50) {
    return { ok: false, error: 'Benutzername max 50 Zeichen' }
  }

  // Password validation
  if (!password || typeof password !== 'string' || password.trim() === '') {
    return { ok: false, error: 'Passwort erforderlich' }
  }

  if (password.length < 1) {
    return { ok: false, error: 'Passwort mindestens 1 Zeichen' }
  }

  return { ok: true, value: { username: username.trim(), password } }
}

export function validateLogoutInput(data) {
  if (!data) {
    return { ok: false, error: 'Keine Daten gefunden' }
  }

  const { sessionId } = data

  // SessionId can be null (logout without session)
  if (sessionId && typeof sessionId !== 'string') {
    return { ok: false, error: 'Ungültige Session-ID' }
  }

  return { ok: true, value: { sessionId: sessionId || null } }
}

export function validateSessionInfoInput(data) {
  if (!data) {
    return { ok: false, error: 'Keine Daten gefunden' }
  }

  const { sessionId } = data

  // SessionId can be null (check without session)
  if (sessionId && typeof sessionId !== 'string') {
    return { ok: false, error: 'Ungültige Session-ID' }
  }

  return { ok: true, value: { sessionId: sessionId || null } }
}
