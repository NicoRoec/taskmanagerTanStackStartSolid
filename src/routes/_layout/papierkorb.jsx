import { createFileRoute } from '@tanstack/react-router';
import { Trash2, RotateCcw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../__root';
import { getTasksForTrash, permanentlyDeleteTask, restoreTask } from '../../server/task-functions';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';

/**
 * TanStack Table - Headless Tabellen-Logik für mehrere Routes
 * ===========================================================
 * 
 * DIESE DATEI: Gelöschte Tasks (Trash/Papierkorb)
 * VERGLEICH: src/routes/_layout/aufgaben.jsx (aktive Tasks)
 * 
 * Code-Wiederverwendung durch Headless Pattern:
 * ==============================================
 * Beide Routes nutzen TanStack Table mit GLEICHEN Basis-Spalten:
 * 
 * Gemeinsame Spalten:
 * - Nr. (ID)
 * - Titel
 * - Status (mit Farben)
 * - Priorität (mit Farben) [NICHT in Papierkorb, nur in aufgaben.jsx]
 * - Besitzer (in Papierkorb zusätzlich)
 * - Gelöscht am / Fällig am (unterschiedliche Spalten)
 * 
 * Unterschiedliche Action-Spalten:
 * ================================
 * 
 * /aufgaben (Aktive Tasks):
 * ├─ Bearbeiten (Pen-Icon)
 * │  └─ Öffnet Modal mit TanStack Form
 * │  └─ Nur Admin
 * └─ Soft Delete (Trash-Icon)
 *    └─ Setzt is_deleted = 1
 *    └─ Task ist noch reversibel!
 *    └─ Nur Admin
 * 
 * /papierkorb (Gelöschte Tasks):
 * ├─ Wiederherstellen (Undo-Icon)
 * │  └─ Setzt is_deleted = 0
 * │  └─ Task zurück in aktive Liste
 * │  └─ Alle User für ihre eigenen Tasks
 * └─ Permanent Delete (Trash-Icon)
 *    └─ DELETE FROM DB (hard delete!)
 *    └─ KEINE Wiederherstellung möglich
 *    └─ Nur Admin
 * 
 * Warum ist das besser als Code-Duplizierung?
 * ============================================
 * Statt zwei separate Table-Implementierungen zu schreiben,
 * nutzen wir TanStack Table's Spalten-System:
 * 
 * ❌ FALSCH (Duplizierung):
 * function AufgabenTable() { ... hardcoded table HTML ... }
 * function PapierkorbTable() { ... hardcoded table HTML ... }
 * => Viel Duplikat-Code, schwer zu warten
 * 
 * ✅ RICHTIG (Reusable):
 * const columns = [
 *   { accessorKey: 'id', header: 'Nr.' },
 *   { accessorKey: 'title', header: 'Titel' },
 *   ... gemeinsame Spalten ...
 *   ...(isTrashView ? [trashActions] : [activeActions])
 * ]
 * const table = useReactTable({ data, columns })
 * => Einmal HTML Template, verschiedene Daten/Aktionen!
 * 
 * TanStack Table ermöglicht's durch Headless-Design:
 * - User schreiben nur Spalten-Definitionen (pure JS Objects)
 * - Nicht an UI gekoppelt
 * - Gleiche Rendering-Logik per Route
 */

/**
 * TanStack Router - Datei-basiertes Routing
 * ==========================================
 * 
 * Diese Datei: src/routes/_layout/papierkorb.jsx
 * => Automatische Route: /papierkorb
 * 
 * Loader-Pattern:
 * ===============
 * Der Loader laeuft VOR dem Komponenten-Render:
 * 1. TanStack Router fuehrt den Loader aus
 * 2. Ergebnis ist im loaderData verfuegbar
 * 3. Komponente rendert mit Daten (kein Loading-State noetig!)
 * 
 * Vorteile:
 * - Daten im Initial HTML (SSR-freundlich)
 * - Schnelleres Rendering als useEffect + useState
 * - Type-safe in TypeScript
 */
export const Route = createFileRoute('/_layout/papierkorb')({
  loader: async () => {
    // Die sessionId wird nach der Auth geladen (im Component via useAuth)
    // Deshalb geben wir hier nur ein leeres Array zurueck
    // und laden im Component ueber TanStack Query
    return { tasks: [] };
  },
  component: PapierkorbPage,
});

function PapierkorbPage() {
  const { session, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const trashQueryKey = ['tasks', 'trash', session?.sessionId ?? null];
  const [permanentDeleteId, setPermanentDeleteId] = useState(null);
  const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);

  /**
   * TanStack Query fuer Papierkorb
   * ==============================
   * Auch hier nutzen wir Query, damit die Daten gecached werden
   * und sich automatisch aktualisieren, sobald Tasks geloescht
   * oder wiederhergestellt werden.
   */
  const trashQuery = useQuery({
    queryKey: trashQueryKey,
    enabled: Boolean(session?.sessionId),
    queryFn: async () => {
      const nextTasks = await getTasksForTrash({
        data: { sessionId: session.sessionId },
      });

      return nextTasks || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const tasks = trashQuery.data || [];

  const restoreTaskMutation = useMutation({
    mutationFn: async (payload) => restoreTask({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.setQueryData(trashQueryKey, (prev = []) =>
        prev.filter((task) => task.id !== variables.taskId)
      );

      // Restore bewegt Tasks zur aktiven Liste -> beide Queries invalidieren.
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] });
    },
  });

  const permanentlyDeleteMutation = useMutation({
    mutationFn: async (payload) => permanentlyDeleteTask({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.setQueryData(trashQueryKey, (prev = []) =>
        prev.filter((task) => task.id !== variables.taskId)
      );

      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] });
    },
  });

  function getOwnerName(ownerId) {
    if (ownerId === 1) return 'Admin';
    if (ownerId === 2) return 'user';
    return `User ${ownerId}`;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  }

  /**
   * Wiederherstellen - Task aus Papierkorb zurück in die Hauptliste
   * 
   * Ownership wird serverseitig gecheckt:
   * - Admin: Kann JEDE Task wiederherstellen
   * - User: Kann nur ihre eigenen Tasks wiederherstellen
   */
  async function handleRestore(taskId) {
    if (!session?.sessionId) return;

    try {
      const result = await restoreTaskMutation.mutateAsync({
        sessionId: session.sessionId,
        taskId,
      });

      if (!result.success) {
        alert(`Fehler: ${result.error}`);
        return;
      }

    } catch (error) {
      console.error('Fehler beim Wiederherstellen:', error);
      alert('Fehler beim Wiederherstellen. Bitte versuche es erneut.');
    }
  }

  /**
   * Permanent löschen - Task unwiderruflich aus der DB entfernen
   * 
   * Sicherheit:
   * ===========
   * Nur Admins duerfen permanent loeschen!
   * (Enforcement auf dem Server in der Server Function)
   * 
   * Deshalb ist der Button auch nur fuer Admins sichtbar.
   */
  function openPermanentDeleteConfirm(taskId) {
    setPermanentDeleteId(taskId);
    setShowConfirmPermanent(true);
  }

  async function confirmPermanentDelete() {
    if (!isAdmin || !session?.sessionId || !permanentDeleteId) return;

    try {
      const result = await permanentlyDeleteMutation.mutateAsync({
        sessionId: session.sessionId,
        taskId: permanentDeleteId,
      });

      if (!result.success) {
        alert(`Fehler: ${result.error}`);
        return;
      }

      setShowConfirmPermanent(false);
      setPermanentDeleteId(null);
    } catch (error) {
      console.error('Fehler beim permanenten Loeschen:', error);
      alert('Fehler beim Loeschen. Bitte versuche es erneut.');
    }
  }

  function cancelPermanentDelete() {
    setShowConfirmPermanent(false);
    setPermanentDeleteId(null);
  }

  // Spalten-Definition für TanStack Table
  const columns = useMemo(
    () => [
      /**
       * Spalten-Architektur erklärt (Papierkorb-Version)
       * ==============================================
       * 
       * Diese Spalten sind ähnlich wie in aufgaben.jsx, aber:
       * - Status wird ohne Farben angezeigt (nicht so kritisch bei Trash)
       * - Keine Priorität im Papierkorb
       * - Zusätzliche Spalte: Besitzer (ownerId) - wichtig für Admins!
       * - Zusätzliche Spalte: updated_at (wann wurde gelöscht?)
       * - ANDERE Aktionen: Restore + PermDelete (nicht Edit!)
       * 
       * Warum andere Spalten?
       * ====================
       * 1. Gelöschte Tasks sollen nicht bearbeitet werden
       *    (macht keinen Sinn, sie sind nicht "aktiv")
       * 2. Admins müssen sehen, DER die Task gelöscht hat (Besitzer)
       * 3. Audit-Trail: Wann wurde gelöscht? (updated_at)
       * 4. Aktionen sind Recovery-orientiert, nicht Edit-orientiert
       * 
       * TanStack Table ermöglicht die flexibilität:
       * - Wir definieren völlig unterschiedliche Spalten
       * - Nutzen aber die GLEICHE table.tsx rendering logic
       * - Nur die Datenwerte (columns config) ändern sich pro Route!
       */
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
        accessorKey: 'ownerId',
        header: 'Besitzer',
        cell: (info) => getOwnerName(info.getValue()),
      },
      {
        accessorKey: 'updated_at',
        header: 'Gelöscht am',
        cell: (info) => formatDate(info.getValue()),
      },
      {
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* Wiederherstellen - alle User duerfen ihre eigenen Tasks wiederherstellen */}
            <button
              type="button"
              onClick={() => handleRestore(row.original.id)}
              className="text-blue-600 hover:text-blue-800"
              aria-label="Aufgabe wiederherstellen"
              title="Aus Papierkorb wiederherstellen"
            >
              <RotateCcw size={16} />
            </button>

            {/* Permanent löschen - nur Admin! */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => openPermanentDeleteConfirm(row.original.id)}
                className="text-red-600 hover:text-red-800"
                aria-label="Aufgabe permanent löschen"
                title="Endgültig löschen (keine Wiederherstellung möglich!)"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
        size: 150,
      },
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
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Papierkorb</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gelöschte Aufgaben können wiederhergestellt oder endgültig gelöscht werden</p>
      </div>

      {/* Info-Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 flex gap-3">
        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Soft Delete erklärt:</strong> Gelöschte Aufgaben sind hier noch sichtbar und können wiederhergestellt werden.
          Nur Admins können Sie endgültig löschen (hart delete).
        </div>
      </div>

      {/* Trash Table */}
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Trash2 size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="font-medium text-gray-900 dark:text-white">Papierkorb ist leer</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Gelöschte Aufgaben werden hier angezeigt</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info-Text */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {tasks.length} gelöschte Aufgabe(n)
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {isAdmin && showConfirmPermanent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={cancelPermanentDelete} />
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-red-800 dark:text-red-200">
                <strong>Warnung!</strong> Diese Aktion kann <strong>nicht</strong> rückgängig gemacht werden.
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aufgabe endgültig löschen?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Die Aufgabe wird unwiderruflich aus der Datenbank entfernt. Sie können Sie später nicht mehr wiederherstellen.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelPermanentDelete}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
