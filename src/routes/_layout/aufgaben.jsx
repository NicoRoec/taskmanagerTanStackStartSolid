import { createFileRoute } from '@tanstack/react-router';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, PenSquare, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAuth } from '../__root';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';

/**
 * TanStack Table - Headless UI Bibliothek für Tabellen
 * ====================================================
 * 
 * Was ist TanStack Table?
 * -----------------------
 * TanStack Table ist eine leistungsstarke, headless (UI-agnostische) 
 * Tabellenbibliothek für React, Vue, Solid und andere Frameworks.
 * 
 * Was bedeutet "headless"?
 * ------------------------
 * "Headless" bedeutet, dass die Bibliothek KEINE vorgefertigten UI-Komponenten
 * oder Styles bereitstellt. Sie liefert nur die LOGIK und STATE-MANAGEMENT:
 * - Sortierung
 * - Filterung
 * - Paginierung
 * - Spalten-Verwaltung
 * - Row-Selection
 * 
 * DU entscheidest, wie die Tabelle aussieht (z.B. mit Tailwind CSS).
 * 
 * Welche Probleme löst TanStack Table?
 * ------------------------------------
 * 1. **Komplexe Tabellen-Logik**: Sortierung, Filterung und Paginierung
 *    sind komplex zu implementieren - TanStack Table übernimmt das.
 * 
 * 2. **Performance**: Effizientes Rendering auch bei tausenden Zeilen
 *    durch Virtualisierung und optimierte Updates.
 * 
 * 3. **Flexibilität**: Keine festgelegten Styles - passt perfekt zu
 *    jedem Design-System (hier: Tailwind CSS).
 * 
 * 4. **Type-Safety**: Vollständige TypeScript-Unterstützung für
 *    Spalten-Definitionen und Daten.
 * 
 * 5. **Framework-agnostisch**: Gleiche API für React, Vue, Solid, etc.
 */

/**
 * Datei-basiertes Routing in TanStack Router
 * -----------------------------------------
 * TanStack Router nutzt die Dateistruktur unter src/routes/, um automatisch
 * Routen zu erstellen. Jede .jsx/.tsx Datei wird zu einer Route.
 * 
 * Diese Datei liegt in: src/routes/_layout/aufgaben.jsx
 * => Daraus wird automatisch die URL: /aufgaben
 * 
 * Verschachtelte (Nested) Routen
 * ------------------------------
 * Unterordner und Dateien mit gleichem Präfix erzeugen Unterrouten:
 * - src/routes/_layout/aufgaben/neu.jsx => URL: /aufgaben/neu
 * 
 * Beide Routen teilen sich das Layout aus src/routes/_layout.jsx,
 * da sie beide im _layout Ordner liegen.
 * 
 * Vorteile:
 * - Automatisches Routing ohne manuelle Route-Konfiguration
 * - Klare Ordnerstruktur = URL-Struktur
 * - Type-Safety für Route-Parameter und Navigation
 */

export const Route = createFileRoute('/_layout/aufgaben')({
  component: AufgabenPage,
});

function AufgabenPage() {
  const { isAdmin } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  // Mock-Liste der Benutzer für "Zugewiesen an"
  const userOptions = [
    'Admin',
    'Nutzer123',
    'Erika Musterfrau',
    'Max Mustermann',
    'Jon Doe',
    'Chris Coder',
  ];

  // Mock-Daten für die Aufgaben-Tabelle (lokaler State, keine DB)
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Mockup erstellen',
      status: 'in Arbeit',
      priority: 'Mittel',
      dueDate: '31.03.2026',
      assignee: 'Nutzer123',
    },
    {
      id: 2,
      title: 'Abgabe',
      status: 'Neu',
      priority: 'Hoch',
      dueDate: '10.04.2026',
      assignee: 'Nutzer123',
    },
    {
      id: 3,
      title: 'Code Review',
      status: 'Erledigt',
      priority: 'Niedrig',
      dueDate: '15.02.2026',
      assignee: 'Max Mustermann',
    },
    {
      id: 4,
      title: 'Testing durchführen',
      status: 'in Arbeit',
      priority: 'Hoch',
      dueDate: '20.03.2026',
      assignee: 'Erika Musterfrau',
    },
    {
      id: 5,
      title: 'Dokumentation schreiben',
      status: 'Neu',
      priority: 'Mittel',
      dueDate: '25.03.2026',
      assignee: 'Jon Doe',
    },
  ]);

  // Helpers für Admin-Aktionen
  function openCreateForm() {
    if (!isAdmin) return;
    setEditingTaskId(null);
    setIsFormOpen(true);
  }

  function openEditForm(task) {
    if (!isAdmin) return;
    setEditingTaskId(task.id);
    form.setValues({
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee,
    });
    setIsFormOpen(true);
  }

  function deleteTask(taskId) {
    if (!isAdmin) return;
    setDeleteTaskId(taskId);
    setIsDeleteOpen(true);
  }

  function confirmDelete() {
    if (!isAdmin || !deleteTaskId) return;
    setTasks((prev) => prev.filter((task) => task.id !== deleteTaskId));
    setIsDeleteOpen(false);
    setDeleteTaskId(null);
  }

  function cancelDelete() {
    setIsDeleteOpen(false);
    setDeleteTaskId(null);
  }

  /**
   * TanStack Form – wie funktioniert es hier?
   * =========================================
   * 
   * Was ist TanStack Form?
   * - Eine headless Formular-Bibliothek: Sie liefert Logik (State/Validierung/Submit)
   *   und wir gestalten das UI mit Tailwind.
   * 
   * Warum nutzen wir TanStack Form (Vorteile)?
   * - Zentrale Logik statt viele einzelne useState-Handler
   * - Validierung pro Feld + saubere Fehlerausgabe
   * - Einheitlicher Submit-Flow (async/await)
   * - Skalierbar für große Formulare
   * 
   * Nachteile (ehrlich):
   * - Etwas mehr Boilerplate als native Formulare
   * - Zusätzliche Abstraktion, die man verstehen muss
   * 
   * Wie arbeitet es?
   * 1) useForm() verwaltet Formular-State und liefert form.Field.
   * 2) Jedes Feld registriert sich über <form.Field> (Name + Validatoren).
   * 3) form.handleSubmit() validiert und ruft onSubmit auf.
   */
  const form = useForm({
    defaultValues: {
      title: '',
      status: 'Neu',
      priority: 'Mittel',
      dueDate: '',
      assignee: userOptions[0],
    },
    onSubmit: async ({ value }) => {
      if (!isAdmin) return;

      if (editingTaskId) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTaskId
              ? { ...task, ...value }
              : task
          )
        );
      } else {
        const nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
        setTasks((prev) => [
          ...prev,
          {
            id: nextId,
            ...value,
          },
        ]);
      }

      setIsFormOpen(false);
      setEditingTaskId(null);
      form.reset();
    },
  });

  // Spalten-Definition für TanStack Table
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Nr.',
        size: 60,
      },
      {
        accessorKey: 'title',
        header: 'Titel',
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const colorMap = {
            'in Arbeit': 'bg-yellow-100 text-yellow-800',
            'Neu': 'bg-gray-100 text-gray-800',
            'Erledigt': 'bg-green-100 text-green-800',
          };
          return (
            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${colorMap[status]}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priorität',
        cell: (info) => {
          const priority = info.getValue();
          const colorMap = {
            'Hoch': 'text-red-600',
            'Mittel': 'text-orange-600',
            'Niedrig': 'text-blue-600',
          };
          return (
            <span className={`font-medium ${colorMap[priority]}`}>
              {priority}
            </span>
          );
        },
      },
      {
        accessorKey: 'dueDate',
        header: 'Fällig am',
      },
      {
        accessorKey: 'assignee',
        header: 'Zugewiesen an',
      },
      ...(isAdmin
        ? [
            {
              id: 'actions',
              header: 'Aktionen',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(row.original)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Aufgabe bearbeiten"
                  >
                    <PenSquare size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(row.original.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Aufgabe löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
              size: 120,
            },
          ]
        : []),
    ],
    [isAdmin]
  );

  // Sortier-State
  const [sorting, setSorting] = useState([]);

  // TanStack Table Instance erstellen
  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-full">
      {/* Header Bereich */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Aufgabenliste</h2>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-6 text-sm">
          <button className="text-gray-900 font-medium border-b-2 border-gray-900 pb-1">
            Alle Aufgaben
          </button>
          <button className="text-gray-500 hover:text-gray-900 pb-1">
            Meine Aufgaben
          </button>
        </div>
      </div>

      {/* TanStack Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {/* Sortier-Indikator */}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info-Text über die Tabelle */}
      <div className="mt-4 text-sm text-gray-600">
        {table.getRowModel().rows.length} Aufgabe(n) • Klicke auf Spalten-Überschriften zum Sortieren
      </div>

      {/* Floating Action Button (FAB) - nur Admins */}
      {isAdmin && (
        <button
          type="button"
          onClick={openCreateForm}
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Neue Aufgabe erstellen"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modal: Task erstellen/bearbeiten (nur Admin) */}
      {isAdmin && isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-lg shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTaskId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="title"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Titel ist erforderlich' : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Mockup erstellen"
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="status">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Neu">Neu</option>
                        <option value="in Arbeit">in Arbeit</option>
                        <option value="Erledigt">Erledigt</option>
                      </select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="priority">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priorität
                      </label>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Niedrig">Niedrig</option>
                        <option value="Mittel">Mittel</option>
                        <option value="Hoch">Hoch</option>
                      </select>
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="assignee">
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zugewiesen an
                    </label>
                    <select
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {userOptions.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field
                name="dueDate"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Fälligkeitsdatum ist erforderlich' : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fällig am
                    </label>
                    <input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingTaskId ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Löschen bestätigen (nur Admin) */}
      {isAdmin && isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={cancelDelete} />
          <div className="relative bg-white w-full max-w-md rounded-lg shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Aufgabe löschen?</h3>
              <button
                type="button"
                onClick={cancelDelete}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Möchtest du die Aufgabe wirklich löschen?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
