import { createFileRoute, redirect } from '@tanstack/solid-router'
import { createMemo, createSignal, For, Show } from 'solid-js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/solid-query'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Pencil, Trash2, X } from 'lucide-solid'
import { createSolidTable, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel } from '@tanstack/solid-table'
import { createVirtualizer } from '@tanstack/solid-virtual'
import { getSessionInfo } from '../../../server/auth-functions'
import { createUser, deleteUser, getUsersForAdmin, updateUser } from '../../../server/user-functions'
import { useAuth } from '../../__root'
import { useAppForm } from '../../../hooks/demo.form'

export const Route = createFileRoute('/_layout/admin/nutzer')({
  component: AdminNutzerPage,
  beforeLoad: async () => {
    const sessionId =
      typeof document !== 'undefined'
        ? document.cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('task_session='))
            ?.split('=')[1] || null
        : null

    const session = await getSessionInfo({ data: { sessionId } })
    if (!session?.authenticated || session.role !== 'admin') {
      throw redirect({ to: '/login' })
    }
  },
})

function AdminNutzerPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = createSignal(false)
  const [sorting, setSorting] = createSignal([])
  const [globalFilter, setGlobalFilter] = createSignal('')
  const [roleFilter, setRoleFilter] = createSignal('all')
  let scrollContainerRef

  const ROW_HEIGHT = 52

  const usersQuery = useQuery(() => ({
    queryKey: ['admin', 'users', auth.session?.sessionId ?? null],
    enabled: Boolean(auth.session?.sessionId),
    queryFn: () => getUsersForAdmin({ data: { sessionId: auth.session?.sessionId } }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }))

  const createUserForm = useAppForm(() => ({
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
    },
    onSubmit: async ({ value }) => {
      if (!auth.session?.sessionId) return

      await createUserMutation.mutateAsync({
        sessionId: auth.session.sessionId,
        name: value.name,
        email: value.email,
        role: value.role,
      })

      createUserForm.reset()
      setShowCreateModal(false)
    },
  }))

  const createUserMutation = useMutation(() => ({
    mutationFn: (payload) => createUser({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  }))

  const updateUserMutation = useMutation(() => ({
    mutationFn: (payload) => updateUser({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  }))

  const deleteUserMutation = useMutation(() => ({
    mutationFn: (payload) => deleteUser({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  }))

  function openCreateModal() {
    createUserForm.reset()
    setShowCreateModal(true)
  }

  async function handleEditUser(user) {
    if (!auth.session?.sessionId) return
    const nextName = window.prompt('Name', user.name)
    if (!nextName) return
    const nextEmail = window.prompt('E-Mail', user.email)
    if (!nextEmail) return

    await updateUserMutation.mutateAsync({
      sessionId: auth.session.sessionId,
      userId: user.id,
      name: nextName,
      email: nextEmail,
      role: user.role,
    })
  }

  async function handleDeleteUser(user) {
    if (!auth.session?.sessionId) return
    const ok = window.confirm(`Nutzer ${user.name} loeschen?`)
    if (!ok) return

    await deleteUserMutation.mutateAsync({
      sessionId: auth.session.sessionId,
      userId: user.id,
      name: user.name,
    })
  }

  const users = createMemo(() => usersQuery.data || [])

  const roleFilteredUsers = createMemo(() => {
    const list = users()
    if (roleFilter() === 'all') return list
    return list.filter((user) => user.role === roleFilter())
  })

  const columns = createMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'email',
      header: 'E-Mail',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'role',
      header: 'Rolle',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'tasksCount',
      header: 'Aufgaben',
      cell: (info) => info.getValue() ?? 0,
    },
    {
      id: 'actions',
      header: 'Aktionen',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: (info) => (
        <div className="flex items-center gap-3">
          <button onClick={() => handleEditUser(info.row.original)} className="text-blue-600"><Pencil size={16} /></button>
          <button onClick={() => handleDeleteUser(info.row.original)} className="text-red-600"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ])

  const table = createSolidTable({
    get data() {
      return roleFilteredUsers()
    },
    get columns() {
      return columns()
    },
    get state() {
      return {
        sorting: sorting(),
        globalFilter: globalFilter(),
      }
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = createMemo(() => {
    sorting()
    globalFilter()
    roleFilter()
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
    const isSorted = column.getIsSorted()
    if (isSorted === 'asc') return <ArrowUp size={14} />
    if (isSorted === 'desc') return <ArrowDown size={14} />
    return <ArrowUpDown size={14} className="text-gray-400" />
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutzer verwalten</h2>
      </div>

      <div className="flex gap-3">
        <input
          value={globalFilter()}
          onInput={(e) => setGlobalFilter(e.currentTarget.value)}
          placeholder="Suche nach Name oder E-Mail..."
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full max-w-md"
        />
        <select
          value={roleFilter()}
          onChange={(e) => setRoleFilter(e.currentTarget.value)}
          className="px-3 py-2 rounded border"
        >
          <option value="all">Alle Rollen</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
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
                        className={`text-left px-4 py-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
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
        aria-label="Neuen Nutzer anlegen"
        title="Neuen Nutzer anlegen"
      >
        <Plus size={24} />
      </button>

      <Show when={showCreateModal()}>
        <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Neuen Nutzer anlegen</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                createUserForm.handleSubmit()
              }}
            >
              <createUserForm.AppField name="name">
                {(field) => (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Name</span>
                    <input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onInput={(e) => field.handleChange(e.currentTarget.value)}
                      placeholder="Max Mustermann"
                      className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </label>
                )}
              </createUserForm.AppField>

              <createUserForm.AppField name="email">
                {(field) => (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">E-Mail</span>
                    <input
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onInput={(e) => field.handleChange(e.currentTarget.value)}
                      placeholder="name@firma.de"
                      className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </label>
                )}
              </createUserForm.AppField>

              <createUserForm.AppField name="role">
                {(field) => (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Rolle</span>
                    <select
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.currentTarget.value)}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                )}
              </createUserForm.AppField>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={createUserMutation.isPending}
                >
                  Nutzer erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  )
}
