import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  // Mock-Daten für die Aufgaben-Tabelle
  const data = useMemo(
    () => [
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
    ],
    []
  );

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
    ],
    []
  );

  // Sortier-State
  const [sorting, setSorting] = useState([]);

  // TanStack Table Instance erstellen
  const table = useReactTable({
    data,
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
        
        {/* Navigation zwischen Task-Liste und Task-Erstellung */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/aufgaben"
            className="px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Task-Liste
          </Link>
          <Link
            to="/aufgaben/neu"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Task erstellen
          </Link>
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

      {/* Floating Action Button (FAB) - Plus Button unten rechts */}
      <Link
        to="/aufgaben/neu"
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Neue Aufgabe erstellen"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
