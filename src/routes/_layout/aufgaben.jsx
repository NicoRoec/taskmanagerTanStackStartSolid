import { createFileRoute } from '@tanstack/react-router';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, PenSquare, Trash2, X, Search } from 'lucide-react';
import { useMemo, useState, useCallback, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../__root';
import { useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { getTasksForList, createTask, updateTask, deleteTask } from '../../server/task-functions';
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
 * DIESE DATEI: Aktive Tasks (nicht gelöschte)
 * VERGLEICH: src/routes/_layout/papierkorb.jsx (gelöschte Tasks)
 * 
 * Headless Pattern erklärt:
 * ========================
 * TanStack Table ist "headless" - das bedeutet:
 * - Die Bibliothek liefert NUR die LOGIK (Sortierung, Filter, etc.)
 * - Keine vordefinierten HTML/CSS Komponenten
 * - WIR definieren das Aussehen mit Tailwind
 * 
 * Vorteil: Beide Routes (aufgaben + papierkorb) können die gleiche
 * TanStack Table Logic nutzen, aber unterschiedliche UI/Aktionen haben!
 * 
 * Spalten-Wiederverwendung:
 * =========================
 * Beide Routes nutzen GLEICHE Spalten für:
 * - Nr. (ID)
 * - Titel
 * - Status (mit Farben)
 * - Priorität (mit Farben)
 * - Fällig am (Datum)
 * 
 * Unterschiedliche Spalten pro Route:
 * ===================================
 * 
 * /aufgaben:
 *   Aktionen: [Bearbeiten (Pen)] [Soft Delete (Trash)]
 *   - Nur Admins sehen diese Buttons
 *   - Bearbeiten öffnet Modal mit TanStack Form
 *   - Soft Delete setzt is_deleted=1 (reversibel!)
 * 
 * /papierkorb:
 *   Aktionen: [Wiederherstellen (Undo)] [Permanent Delete (Trash)]
 *   - Alle User können ihre eigenen Tasks wiederherstellen
 *   - Nur Admins können permanent löschen (hard delete)
 *   - Keine Bearbeitung möglich (Tasks sind gelöscht!)
 * 
 * Diese Unterschiede werden in der useReactTable() columns Definition
 * durch Conditionals (isAdmin) definiert.
 * 
 * Lizenzmodell:
 * =============
 * Statt zwei völlig verschiedene Tabellen-Komponenten zu schreiben,
 * nutzen wir ein Spalten-System. Die Zeilen-rendering ist identisch,
 * aber die Action-Spalte ändert sich je nach Route/Kontext.
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
  /**
   * TanStack Search - URL-State Management
   * ======================================
   * validateSearch definiert, welche URL-Parameter zu dieser Route gehören.
   * Mit Zod wird der Typ validiert und normalisiert.
   * 
   * TanStack Router hält diese Parameter im URL sync:
   * - /aufgaben?q=Mockup -> useSearch() gibt { q: 'Mockup' } zurück
   * - Wenn Nutzer URL direkt öffnet: Suchfeld wird mit Wert gefüllt
   * - Bei Bookmarks/Share: Der Suchzustand ist automatisch gespeichert!
   * 
   * Zod Schema: Definiert den Typ der Suchparams
   * - q: optionaler string (Suchtext), default: leerer String
   * - Wird vom React Router zur Validierung/Normalisierung genutzt
   */
  validateSearch: z.object({
    q: z.string().optional().default(''),
  }).parse,
  /**
   * TanStack Router Loader
   * ======================
   * 
   * Loader laufen vor dem Rendern der Route. Hier laden wir die Tasks
   * aus der DB, damit die Seite direkt mit Daten gerendert wird.
   */
  loader: async () => {
    // SSR-sicher: Die Tasks werden erst nach dem Hydrieren im Client geladen,
    // damit Server- und Client-HTML uebereinstimmen.
    return { tasks: [] };
  },
});

function AufgabenPage() {
  const { isAdmin, session } = useAuth();
  const loaderData = Route.useLoaderData() || { tasks: [] };
  const navigate = Route.useNavigate();
  const search = useSearch({ from: '/_layout/aufgaben' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const searchInputRef = useRef();

  /**
   * Debounce für Suchfeld
   * ====================
   * Wir wollen nicht bei JEDEM Keystroke einen neuen Query starten.
   * debounceTimer verzögert den URL-Update um 300ms.
   * Dadurch: Nutzer tippt "Mockup", und erst 300ms nach dem letzten Keystroke
   * wird die Query neu gemacht.
   */
  const debounceTimer = useRef();

  const handleSearchChange = useCallback(
    (value) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        navigate({ search: (prev) => ({ ...prev, q: value }) });
      }, 300);
    },
    [navigate]
  );

  // Mock-Liste der Benutzer für "Zugewiesen an"
  const userOptions = [
    'Admin',
    'user',
    'Erika Musterfrau',
    'Max Mustermann',
    'Jon Doe',
    'Chris Coder',
  ];

  function formatDateToInput(value) {
    if (!value) return '';
    if (value.includes('.')) {
      const [day, month, year] = value.split('.');
      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return value;
  }

  function formatDateForDisplay(value) {
    if (!value) return '';
    if (value.includes('-')) {
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        return `${day}.${month}.${year}`;
      }
    }
    return value;
  }

  function normalizeAssignee(value) {
    if (value === null || value === undefined || value === '') {
      return userOptions[0];
    }
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      if (numericValue === 1) return 'Admin';
      if (numericValue === 2) return 'user';
      return `User ${numericValue}`;
    }
    return value;
  }

  const queryClient = useQueryClient();
  const tasksQueryKey = ['tasks', 'list', session?.sessionId ?? null, selectedTab, search.q];

  /**
   * TanStack Query + TanStack Search Integration
   * ============================================
   * Die QueryKey enthält AUCH den search.q Parameter.
   * Das bedeutet: Wenn URL sich ändert (z.B. ?q=Mockup), wird
   * automatisch eine neue Query mit den neuen Daten gemacht.
   * 
   * TanStack Router + Query Sync:
   * - URL ändert → search.q ändert
   * - search.q ändert → queryKey ändert
   * - queryKey ändert → TanStack Query refetcht automatisch
   * ✅ Perfekt für bookmarkbare/shareable Suchfilter!
   */
  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    enabled: Boolean(session?.sessionId),
    placeholderData: loaderData.tasks || [],
    queryFn: async () => {
      const nextTasks = await getTasksForList({
        data: {
          sessionId: session.sessionId,
          filterType: selectedTab,
          searchQuery: search.q,  // Suchtext aus URL zum Server senden
        },
      });

      return (nextTasks || []).map((task) => ({
        ...task,
        assignee: normalizeAssignee(task.assignee),
      }));
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const tasks = tasksQuery.data || [];

  /**
   * Mutations fuer Create/Update/Delete
   * ===================================
   * TanStack Query kapselt die Schreiboperationen und aktualisiert
   * den Cache gezielt, damit die UI sofort konsistent bleibt.
   */
  const createTaskMutation = useMutation({
    mutationFn: async (payload) => createTask({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.setQueryData(tasksQueryKey, (prev = []) => [
        ...prev,
        {
          id: result.taskId,
          title: variables.title,
          status: variables.status,
          priority: variables.priority,
          dueDate: formatDateForDisplay(variables.dueDate),
          assignee: normalizeAssignee(variables.assignedTo),
          owner_id: session?.userId,
        },
      ]);

      // Andere Filter-Views aktualisieren (z.B. "my" vs "all").
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload) => updateTask({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((task) =>
          task.id === variables.taskId
            ? {
                ...task,
                title: variables.title,
                status: variables.status,
                priority: variables.priority,
                dueDate: formatDateForDisplay(variables.dueDate),
                assignee: normalizeAssignee(variables.assignedTo),
              }
            : task
        )
      );

      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (payload) => deleteTask({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.filter((task) => task.id !== variables.taskId)
      );

      // Soft Delete fuehrt Task in den Papierkorb - Trash-Query muss updaten.
      queryClient.invalidateQueries({ queryKey: ['tasks', 'trash'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });

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
  /**
   * TanStack Form mit Server Functions
   * ==================================
   * 
   * Wichtig: Das Formular sendet nun Daten an Server Functions,
   * nicht nur an lokale useState-Updates!
   * 
   * onSubmit wird async und ruft:
   * - createTask() fuer neue Tasks
   * - updateTask() fuer Updates
   * 
   * Diese Server Functions enforcing Ownership & Autorisierung auf dem Server!
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
      if (!isAdmin || !session?.sessionId) return;

      try {
        if (editingTaskId) {
          // ===== UPDATE TASK =====
          // Server Function ueberprueft: nur Admin oder Owner darf updaten
          const result = await updateTaskMutation.mutateAsync({
            sessionId: session.sessionId,
            taskId: editingTaskId,
            title: value.title,
            status: value.status,
            priority: value.priority,
            dueDate: value.dueDate, // ISO-Format (YYYY-MM-DD) vom input type=date
            assignedTo: value.assignee, // Zugewiesen an
          });

          if (!result.success) {
            alert(`Fehler: ${result.error}`);
            return;
          }
        } else {
          // ===== CREATE TASK =====
          // Server Function liest owner_id automatisch aus Session
          // Client kann owner_id nicht manipulieren!
          const result = await createTaskMutation.mutateAsync({
            sessionId: session.sessionId,
            title: value.title,
            status: value.status,
            priority: value.priority,
            dueDate: value.dueDate, // ISO-Format (YYYY-MM-DD) vom input type=date
            assignedTo: value.assignee, // Zugewiesen an
          });

          if (!result.success) {
            alert(`Fehler: ${result.error}`);
            return;
          }
        }

        setIsFormOpen(false);
        setEditingTaskId(null);
        form.reset();
      } catch (error) {
        console.error('Fehler beim Submit:', error);
        alert('Fehler beim Speichern. Bitte versuche es erneut.');
      }
    },
  });

  // Helpers für Admin-Aktionen
  function openCreateForm() {
    if (!isAdmin) return;
    setEditingTaskId(null);
    form.reset();
    setIsFormOpen(true);
  }

  function openEditForm(task) {
    // Nur Admin darf editieren
    if (!isAdmin) {
      alert('Nur Administratoren dürfen Aufgaben bearbeiten.');
      return;
    }
    setEditingTaskId(task.id);
    form.setFieldValue('title', task.title);
    form.setFieldValue('status', task.status);
    form.setFieldValue('priority', task.priority);
    form.setFieldValue('dueDate', formatDateToInput(task.dueDate));
    form.setFieldValue('assignee', normalizeAssignee(task.assignee));
    setIsFormOpen(true);
  }

  async function handleDeleteTask(taskId, task) {
    if (!session?.sessionId) return;

    // Zuweisungs-Check: Admin oder zugewiesener User darf loeschen
    const isAssignee =
      String(task?.assignee || '').toLowerCase() ===
      String(session?.username || '').toLowerCase();

    if (!isAdmin && !isAssignee) {
      alert('Du darfst nur deine eigenen Aufgaben löschen.');
      return;
    }

    try {
      // Soft Delete: Task wird in Papierkorb verschoben (is_deleted = 1)
      // Keine Bestaetigung noetig - Restore ist noch moglich!
      const result = await deleteTaskMutation.mutateAsync({
        sessionId: session.sessionId,
        taskId,
      });

      if (!result.success) {
        alert(`Fehler: ${result.error}`);
        return;
      }

    } catch (error) {
      console.error('Fehler beim Loeschen:', error);
      alert('Fehler beim Loeschen. Bitte versuche es erneut.');
    }
  }

  // Spalten-Definition für TanStack Table
  const columns = useMemo(
    () => [
      /**
       * Spalten-Architektur erklärt (Aktive Tasks Version)
       * ==================================================
       * 
       * Diese Spalten "fokussieren" auf aktive Tasks:
       * - Benutzer müssen Titel, Status, Priorität + Datum kennen
       * - Besitzer ist NICHT wichtig (User sehen nur ihre eigenen + Admin sieht alle)
       * - Gelösch-Datum ist nicht relevant (es gibt keine!)
       * 
       * Vergleich mit papierkorb.jsx:
       * ============================
       * 
       * Beide Routes: Titel, Status
       * 
       * Aufgaben (aktiv):    Priorität, Fällig am,     Zugewiesen an
       * Papierkorb (trash):  Besitzer,  Gelöscht am,   (nicht relevant)
       * 
       * Aktionen:
       * Aufgaben:   [✏️ Bearbeiten] [🗑️ Soft Delete]
       * Papierkorb: [↩️ Restore]    [🗑️ Hard Delete]
       * 
       * Warum diese Unterscheidung?
       * ===========================
       * 1. Aktive Tasks: User wollen sie bearbeiten/löschen
       * 2. Gelöschte Tasks: User wollen sie wiederherstellen
       * 3. Ampel-Prinzip: Bearbeiten = Grün (produktiv)
       *                    Löschen = Rot (nur wenn nötig)
       *                    Restore = Blau (Notfall-Recovery)
       * 
       * Die TABLE-RENDERING-LOGIK ist identisch!
       * Nur die columns-Config (JS Objects) unterscheiden sich.
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
          <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue()}</span>
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
      {
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          /**
           * Row-Level Permissions für Actions
           * ==================================
           * 
           * Edit [✏️]: NUR Admin (normalUser sieht Button nicht)
           * Delete [🗑️]: Admin oder Task-Owner
           * 
           * Diese UI-Checks sind REDUNDANT mit Server-Side Checks,
           * aber bessere UX (keine disabled-Buttons, einfach verstecken).
           * 
           * Server-Side Enforcement in updateTask/deleteTask:
           * - updateTask: WHERE is_deleted = 0 + owner_id Check
           * - deleteTask: owner_id Check (admin bypass)
           */
          // Zuweisungs-Check: Aktueller User ist zuständig?
          const isAssignee =
            String(row.original?.assignee || '').toLowerCase() ===
            String(session?.username || '').toLowerCase();

          // Edit: Nur Admin
          const canEdit = isAdmin;
          // Delete: Admin oder zugewiesener User
          const canDelete = isAdmin || isAssignee;

          return (
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openEditForm(row.original)}
                  className="text-blue-600 hover:text-blue-800"
                  aria-label="Aufgabe bearbeiten"
                >
                  <PenSquare size={16} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDeleteTask(row.original.id, row.original)}
                  className="text-red-600 hover:text-red-800"
                  aria-label="Aufgabe in Papierkorb verschieben"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
        size: 120,
      },
    ],
    [isAdmin, session]
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
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Aufgabenliste</h2>
        </div>
        
        {/* Suchfeld - TanStack Search Integration */}
        <div className="mb-4 relative">
          {/*
            TanStack Search Suchfeld
            ========================
            Das Input-Feld speichert seinen Wert in der URL (?q=...).
            Bei jedem Keystroke wird nach 300ms die Query neu gestartet.
            
            Vorteile dieser Implementierung:
            1. Suchzustand ist bookmarkbar/shareable (URL enthält q-Param)
            2. Browser Back/Forward funktioniert (Router verwaltet History)
            3. Mehrere Tabs/Fenster sind automatisch synced (gleiche URL = gleiche Suche)
            4. Suchverlauf ist im Browser-History sichtbar
            
            Ohne TanStack Search würde die Suche nur lokal sein (nicht in URL).
          */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Nach Aufgaben suchen..."
              defaultValue={search.q}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Filter Tabs - Visibility Control */}
        <div className="flex gap-6 text-sm">
          <button
            onClick={() => setSelectedTab('all')}
            className={`pb-1 ${
              selectedTab === 'all'
                ? 'text-gray-900 dark:text-white font-medium border-b-2 border-gray-900 dark:border-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Alle Aufgaben
          </button>
          <button
            onClick={() => setSelectedTab('my')}
            className={`pb-1 ${
              selectedTab === 'my'
                ? 'text-gray-900 dark:text-white font-medium border-b-2 border-gray-900 dark:border-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Meine Aufgaben
          </button>
        </div>
      </div>

      {/* TanStack Table */}
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
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
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
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTaskId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Mockup erstellen"
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priorität
                      </label>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Zugewiesen an
                    </label>
                    <select
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fällig am
                    </label>
                    <input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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


    </div>
  );
}
