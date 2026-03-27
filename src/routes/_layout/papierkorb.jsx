import { createFileRoute } from '@tanstack/solid-router'
import { createMemo, createSignal, For } from 'solid-js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/solid-query'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Trash2 } from 'lucide-solid'
import { createSolidTable, flexRender, getCoreRowModel, getSortedRowModel } from '@tanstack/solid-table'
import { createVirtualizer } from '@tanstack/solid-virtual'
import { useAuth } from '../__root'
import { getTasksForTrash, permanentlyDeleteTask, restoreTask } from '../../server/task-functions'

export const Route = createFileRoute('/_layout/papierkorb')({
  component: PapierkorbPage,
})

function PapierkorbPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [sorting, setSorting] = createSignal([])
  let scrollContainerRef

  const ROW_HEIGHT = 52

  const trashQuery = useQuery(() => ({
    queryKey: ['tasks', 'trash', auth.session?.sessionId ?? null],
    enabled: Boolean(auth.session?.sessionId),
    queryFn: () => getTasksForTrash({ data: { sessionId: auth.session?.sessionId } }),
    placeholderData: (previousData) => previousData,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }))

  const restoreMutation = useMutation(() => ({
    mutationFn: (payload) => restoreTask({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  }))

  const deleteForeverMutation = useMutation(() => ({
    mutationFn: (payload) => permanentlyDeleteTask({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  }))

  async function handleRestore(taskId) {
    if (!auth.session?.sessionId) return
    await restoreMutation.mutateAsync({ sessionId: auth.session.sessionId, taskId })
  }

  async function handleDeleteForever(taskId) {
    if (!auth.session?.sessionId || !auth.isAdmin) return
    const ok = window.confirm('Task endgültig löschen?')
    if (!ok) return
    await deleteForeverMutation.mutateAsync({ sessionId: auth.session.sessionId, taskId })
  }

  const tasks = createMemo(() => trashQuery.data || [])

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
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'priority',
      header: 'Priorität',
      cell: (info) => info.getValue() || '-',
    },
    {
      accessorKey: 'assignee',
      header: 'Besitzer',
      cell: (info) => info.getValue() || '-',
    },
    {
      id: 'actions',
      header: 'Aktionen',
      enableSorting: false,
      cell: (info) => (
        <div className="flex items-center gap-3">
          <button onClick={() => handleRestore(info.row.original.id)} className="text-emerald-600 dark:text-emerald-400"><RotateCcw size={16} /></button>
          {auth.isAdmin && (
            <button onClick={() => handleDeleteForever(info.row.original.id)} className="text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
          )}
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

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Papierkorb</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Gelöschte Aufgaben wiederherstellen oder dauerhaft entfernen.</p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-amber-900 dark:text-amber-200">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm">
          Nur Admins dürfen Aufgaben endgültig löschen. Normale Nutzer können Aufgaben hier nur wiederherstellen.
        </p>
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
                        className={`text-left px-4 py-2 text-gray-700 dark:text-gray-100 font-semibold ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
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
                        <tr className="border-b border-gray-100 dark:border-gray-700">
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
    </div>
  )
}
