import { createFileRoute } from '@tanstack/solid-router'
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/solid-query'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Pencil, Trash2, X } from 'lucide-solid'
import { createSolidTable, flexRender, getCoreRowModel, getSortedRowModel } from '@tanstack/solid-table'
import { createVirtualizer } from '@tanstack/solid-virtual'
import { useAuth } from '../__root'
import { getTasksForList, createTask, updateTask, deleteTask } from '../../server/task-functions'
import { getUsersForAdmin } from '../../server/user-functions'
import { useAppForm } from '../../hooks/app.form'

export const Route = createFileRoute('/_layout/aufgaben')({
  component: AufgabenPage,
})

function AufgabenPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = createSignal('')
  const [debouncedSearch, setDebouncedSearch] = createSignal('')
  const [filterType, setFilterType] = createSignal('all')
  const [showCreateModal, setShowCreateModal] = createSignal(false)
  const [editingTask, setEditingTask] = createSignal(null)
  const [sorting, setSorting] = createSignal([])
  let scrollContainerRef

  const ROW_HEIGHT = 52

  createEffect(() => {
    const value = searchInput()
    const timer = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
    onCleanup(() => clearTimeout(timer))
  })

  const usersQuery = useQuery(() => ({
    queryKey: ['admin', 'users', auth.session?.sessionId ?? null],
    enabled: Boolean(auth.session?.sessionId) && auth.isAdmin,
    queryFn: () => getUsersForAdmin({ data: { sessionId: auth.session?.sessionId } }),
    staleTime: 120 * 1000,
  }))

  const tasksQuery = useQuery(() => ({
    queryKey: ['tasks', 'list', auth.session?.sessionId ?? null, filterType(), debouncedSearch()],
    enabled: Boolean(auth.session?.sessionId),
    queryFn: () =>
      getTasksForList({
        data: {
          sessionId: auth.session?.sessionId,
          filterType: filterType(),
          searchQuery: debouncedSearch(),
        },
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }))

  const createTaskMutation = useMutation(() => ({
    mutationFn: (payload) => createTask({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  }))

  const updateTaskMutation = useMutation(() => ({
    mutationFn: (payload) => updateTask({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  }))

  const deleteTaskMutation = useMutation(() => ({
    mutationFn: (payload) => deleteTask({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  }))

  const createTaskForm = useAppForm(() => ({
    defaultValues: {
      title: '',
      status: 'Neu',
      priority: 'mittel',
      dueDate: '',
      assignedTo: auth.session?.username || 'Admin',
    },
    onSubmit: async ({ value }) => {
      if (!auth.session?.sessionId) return
      const normalizedStatus = normalizeStatus(value.status)
      const normalizedPriority = normalizePriority(value.priority)
      const normalizedAssignedTo = normalizeAssignee(value.assignedTo)
      const taskToEdit = editingTask()
      if (taskToEdit) {
        await updateTaskMutation.mutateAsync({
          sessionId: auth.session.sessionId,
          taskId: taskToEdit.id,
          title: value.title,
          status: normalizedStatus,
          priority: normalizedPriority,
          dueDate: value.dueDate,
          assignedTo: normalizedAssignedTo,
        })
      } else {
        await createTaskMutation.mutateAsync({
          sessionId: auth.session.sessionId,
          title: value.title,
          status: normalizedStatus,
          priority: normalizedPriority,
          dueDate: value.dueDate,
          assignedTo: normalizedAssignedTo,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeTaskModal()
      createTaskForm.reset()
    },
  }))

  const tasks = createMemo(() => tasksQuery.data || [])

  const assigneeOptions = createMemo(() => {
    const unique = new Map()

    const addName = (name) => {
      const normalized = normalizeAssignee(name)
      const key = normalized.toLowerCase()
      if (!unique.has(key)) {
        unique.set(key, normalized)
      }
    }

    addName(auth.session?.username || 'Admin')
    if (auth.isAdmin) {
      for (const user of usersQuery.data || []) {
        addName(user.name)
      }
      addName('Admin')
    }
    return [...unique.values()]
  })

  const columns = createMemo(() => [
    {
      id: 'index',
      header: '#',
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: 'Titel',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => formatStatus(info.getValue()),
    },
    {
      accessorKey: 'priority',
      header: 'Priorität',
      cell: (info) => formatPriority(info.getValue()),
    },
    {
      accessorKey: 'dueDate',
      header: 'Fällig',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'assignee',
      header: 'Zugehörigkeit',
      cell: (info) => normalizeAssignee(info.getValue()),
    },
    {
      id: 'actions',
      header: 'Aktionen',
      enableSorting: false,
      cell: (info) => (
        <div className="flex items-center gap-3">
          <button onClick={() => handleEditTask(info.row.original)} className="text-blue-600 dark:text-blue-400"><Pencil size={16} /></button>
          <button onClick={() => handleDeleteTask(info.row.original.id)} className="text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ])

  const table = createSolidTable({
    get data() {
      return tasks()
    },
    get columns() {
      return columns()
    },
    get state() {
      return {
        sorting: sorting(),
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = createMemo(() => {
    sorting()
    return table.getRowModel().rows.slice()
  })

  const rowVirtualizer = createVirtualizer({
    get count() {
      return rows().length
    },
    getScrollElement: () => scrollContainerRef,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  })

  function sortIcon(column) {
    sorting()
    const isSorted = column.getIsSorted()
    if (isSorted === 'asc') return <ArrowUp size={14} />
    if (isSorted === 'desc') return <ArrowDown size={14} />
    return <ArrowUpDown size={14} className="text-gray-400" />
  }

  function normalizeStatus(value) {
    const lowered = String(value || '').trim().toLowerCase()
    if (lowered === 'neu') return 'Neu'
    if (lowered === 'in arbeit') return 'In Arbeit'
    if (lowered === 'erledigt') return 'Erledigt'
    return value || 'Neu'
  }

  function normalizePriority(value) {
    const lowered = String(value || '').trim().toLowerCase()
    if (lowered === 'niedrig') return 'Niedrig'
    if (lowered === 'mittel') return 'Mittel'
    if (lowered === 'hoch') return 'Hoch'
    return value || 'Mittel'
  }

  function normalizeAssignee(value) {
    const trimmed = String(value || '').trim()
    if (!trimmed) return 'Admin'
    if (trimmed.toLowerCase() === 'admin') return 'Admin'
    return trimmed
  }

  function formatStatus(value) {
    return normalizeStatus(value)
  }

  function formatPriority(value) {
    return normalizePriority(value)
  }

  function resolveFieldApi(field) {
    return typeof field === 'function' ? field() : field
  }

  function closeTaskModal() {
    setShowCreateModal(false)
    setEditingTask(null)
  }

  createEffect(() => {
    if (!showCreateModal()) return
    const task = editingTask()
    if (!task) return

    // Ensure fields are mounted before applying values the first time.
    const timer = setTimeout(() => {
      if (!showCreateModal() || !editingTask()) return
      const dueDateValue = typeof task.dueDate === 'string' ? task.dueDate.slice(0, 10) : ''
      createTaskForm.reset()
      createTaskForm.setFieldValue('title', task.title || '')
      createTaskForm.setFieldValue('status', normalizeStatus(task.status || 'Neu'))
      createTaskForm.setFieldValue('priority', normalizePriority(task.priority || 'Mittel'))
      createTaskForm.setFieldValue('dueDate', dueDateValue)
      createTaskForm.setFieldValue('assignedTo', normalizeAssignee(task.assignee || auth.session?.username || 'Admin'))
    }, 0)

    onCleanup(() => clearTimeout(timer))
  })

  function openCreateModal() {
    setEditingTask(null)
    setShowCreateModal(true)
    createTaskForm.reset()
    createTaskForm.setFieldValue('status', 'Neu')
    createTaskForm.setFieldValue('priority', 'Mittel')
    createTaskForm.setFieldValue('assignedTo', normalizeAssignee(auth.session?.username || 'Admin'))
  }

  async function handleEditTask(task) {
    setEditingTask(task)
    setShowCreateModal(true)
  }

  async function handleDeleteTask(taskId) {
    if (!auth.session?.sessionId) return
    await deleteTaskMutation.mutateAsync({
      sessionId: auth.session.sessionId,
      taskId,
    })
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Aufgaben</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Aufgaben erstellen, bearbeiten und in den Papierkorb verschieben.</p>
      </div>

      <div className="flex gap-3">
        <input
          value={searchInput()}
          onInput={(e) => setSearchInput(e.currentTarget.value)}
          placeholder="Suche nach Titel oder Zugehörigkeit..."
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full max-w-md"
        />
        <select
          value={filterType()}
          onChange={(e) => setFilterType(e.currentTarget.value)}
          className="px-3 py-2 rounded border"
        >
          <option value="all">Alle</option>
          <option value="my">Meine</option>
        </select>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <tr className="table w-full table-fixed">
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <th
                        className={`text-left px-4 py-2 font-semibold ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="inline-flex items-center gap-2">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {header.column.getCanSort() && sortIcon(header.column)}
                          </div>
                        )}
                      </th>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </thead>
        </table>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <div
            className="relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            <For each={rowVirtualizer.getVirtualItems()}>
              {(virtualRow) => {
                const row = () => rows()[virtualRow.index]
                return (
                  <div
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <table className="w-full text-sm table-fixed">
                      <tbody>
                        <tr className="border-t border-gray-100 dark:border-gray-700">
                          <For each={row()?.getVisibleCells() || []}>
                            {(cell) => (
                              <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            )}
                          </For>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              }}
            </For>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center z-40"
        aria-label="Neue Aufgabe anlegen"
        title="Neue Aufgabe anlegen"
      >
        <Plus size={24} />
      </button>

      <Show when={showCreateModal()}>
        <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4" onClick={closeTaskModal}>
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingTask() ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h3>
              <button type="button" onClick={closeTaskModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                createTaskForm.handleSubmit()
              }}
            >
              <createTaskForm.AppField name="title">
                {(field) => {
                  const api = () => resolveFieldApi(field)
                  return (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Titel</span>
                      <input
                        value={api()?.state?.value ?? ''}
                        onBlur={() => api()?.handleBlur?.()}
                        onInput={(e) => api()?.handleChange?.(e.currentTarget.value)}
                        placeholder="Task Titel"
                        className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                    </label>
                  )
                }}
              </createTaskForm.AppField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <createTaskForm.AppField name="status">
                  {(field) => {
                    const api = () => resolveFieldApi(field)
                    return (
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</span>
                        <select
                          value={api()?.state?.value ?? 'Neu'}
                          onBlur={() => api()?.handleBlur?.()}
                          onChange={(e) => api()?.handleChange?.(e.currentTarget.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                          <option value="Neu">Neu</option>
                          <option value="In Arbeit">In Arbeit</option>
                          <option value="Erledigt">Erledigt</option>
                        </select>
                      </label>
                    )
                  }}
                </createTaskForm.AppField>

                <createTaskForm.AppField name="priority">
                  {(field) => {
                    const api = () => resolveFieldApi(field)
                    return (
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Priorität</span>
                        <select
                          value={api()?.state?.value ?? 'Mittel'}
                          onBlur={() => api()?.handleBlur?.()}
                          onChange={(e) => api()?.handleChange?.(e.currentTarget.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                          <option value="Niedrig">Niedrig</option>
                          <option value="Mittel">Mittel</option>
                          <option value="Hoch">Hoch</option>
                        </select>
                      </label>
                    )
                  }}
                </createTaskForm.AppField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <createTaskForm.AppField name="dueDate">
                  {(field) => {
                    const api = () => resolveFieldApi(field)
                    return (
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Fälligkeit</span>
                        <input
                          type="date"
                          value={api()?.state?.value ?? ''}
                          onBlur={() => api()?.handleBlur?.()}
                          onInput={(e) => api()?.handleChange?.(e.currentTarget.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                      </label>
                    )
                  }}
                </createTaskForm.AppField>

                <createTaskForm.AppField name="assignedTo">
                  {(field) => {
                    const api = () => resolveFieldApi(field)
                    return (
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Zugehörigkeit</span>
                        <select
                          value={api()?.state?.value ?? ''}
                          onBlur={() => api()?.handleBlur?.()}
                          onChange={(e) => api()?.handleChange?.(e.currentTarget.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                          <For each={assigneeOptions()}>
                            {(option) => <option value={option}>{option}</option>}
                          </For>
                        </select>
                      </label>
                    )
                  }}
                </createTaskForm.AppField>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {editingTask() ? 'Änderungen speichern' : 'Aufgabe speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  )
}
