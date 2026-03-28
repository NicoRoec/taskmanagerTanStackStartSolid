function normalizeStatus(value) {
  const lowered = String(value || '').trim().toLowerCase()
  if (lowered === 'neu') return 'Neu'
  if (lowered === 'in arbeit') return 'In Arbeit'
  if (lowered === 'erledigt') return 'Erledigt'
  return String(value || '').trim()
}

function normalizePriority(value) {
  const lowered = String(value || '').trim().toLowerCase()
  if (lowered === 'niedrig') return 'Niedrig'
  if (lowered === 'mittel') return 'Mittel'
  if (lowered === 'hoch') return 'Hoch'
  return String(value || '').trim()
}

function normalizeAssignedTo(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return 'Admin'
  return trimmed.toLowerCase() === 'admin' ? 'Admin' : trimmed
}

function invalid(error) {
  return { ok: false, error }
}

export function validateTaskListInput(data) {
  const filterType = data?.filterType === 'my' ? 'my' : 'all'
  const searchQuery = String(data?.searchQuery || '')
  return {
    ok: true,
    value: { filterType, searchQuery },
  }
}

export function validateCreateTaskInput(data) {
  const title = String(data?.title || '').trim()
  const status = normalizeStatus(data?.status)
  const priority = normalizePriority(data?.priority)
  const dueDate = String(data?.dueDate || '').trim()
  const assignedTo = normalizeAssignedTo(data?.assignedTo)

  if (!title) return invalid('Titel ist erforderlich')
  if (!status) return invalid('Status ist erforderlich')
  if (!priority) return invalid('Priorität ist erforderlich')
  if (!dueDate) return invalid('Fälligkeitsdatum ist erforderlich')

  return {
    ok: true,
    value: { title, status, priority, dueDate, assignedTo },
  }
}

export function validateUpdateTaskInput(data) {
  const base = validateCreateTaskInput(data)
  if (!base.ok) return base

  const taskId = Number(data?.taskId)
  if (!Number.isFinite(taskId)) return invalid('Task-ID ist erforderlich')

  return {
    ok: true,
    value: {
      taskId,
      ...base.value,
    },
  }
}

export function validateTaskIdInput(data) {
  const taskId = Number(data?.taskId)
  if (!Number.isFinite(taskId)) return invalid('Task-ID ist erforderlich')
  return {
    ok: true,
    value: { taskId },
  }
}
