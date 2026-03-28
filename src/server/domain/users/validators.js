function invalid(error) {
  return { ok: false, error }
}

export function validateCreateUserInput(data) {
  const name = String(data?.name || '').trim()
  const email = String(data?.email || '').trim().toLowerCase()
  const role = String(data?.role || '').toLowerCase()

  if (!name) return invalid('Name ist erforderlich')
  if (!email || !email.includes('@')) return invalid('Gültige E-Mail erforderlich')
  if (!['admin', 'user'].includes(role)) return invalid('Rolle ist ungültig')

  return {
    ok: true,
    value: { name, email, role },
  }
}

export function validateUpdateUserInput(data) {
  const base = validateCreateUserInput(data)
  if (!base.ok) return base

  const userId = Number(data?.userId)
  if (!Number.isFinite(userId)) return invalid('Ungültige Nutzer-ID')

  return {
    ok: true,
    value: {
      userId,
      ...base.value,
    },
  }
}

export function validateDeleteUserInput(data) {
  const userId = Number(data?.userId)
  if (!Number.isFinite(userId)) return invalid('Ungültige Nutzer-ID')
  return {
    ok: true,
    value: { userId },
  }
}
