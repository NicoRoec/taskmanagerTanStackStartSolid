import { createFileRoute } from '@tanstack/react-router';
import { Trash2, RotateCcw } from 'lucide-react';

export const Route = createFileRoute('/_layout/papierkorb')({
  component: PapierkorbPage,
});

function PapierkorbPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Papierkorb</h1>
        <p className="text-gray-600 mt-2">Gelöschte Aufgaben und Projekte</p>
      </div>

      {/* Info-Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Gelöschte Aufgaben werden hier 30 Tage lang aufbewahrt, bevor sie endgültig gelöscht werden.
        </p>
      </div>

      {/* Gelöschte Aufgaben - Platzhalter */}
      <div className="bg-white rounded-lg shadow">
        {/* Listenheader */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div className="col-span-5">Aufgabe</div>
          <div className="col-span-3">Gelöscht am</div>
          <div className="col-span-2">Gelöscht von</div>
          <div className="col-span-2 text-right">Aktionen</div>
        </div>

        {/* Empty State */}
        <div className="px-6 py-12 text-center text-gray-500">
          <Trash2 size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="font-medium">Der Papierkorb ist leer</p>
          <p className="text-sm mt-2">Gelöschte Aufgaben erscheinen hier und können wiederhergestellt werden.</p>
        </div>

        {/* Beispiel für gelöschte Aufgabe (ausgeblendet, wird später mit echten Daten gefüllt) */}
        <div className="hidden grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center">
          <div className="col-span-5">
            <span className="font-medium text-gray-700">Beispiel-Aufgabe</span>
          </div>
          <div className="col-span-3 text-gray-600">
            <span>01.02.2026</span>
          </div>
          <div className="col-span-2 text-gray-600">
            <span>Max Mustermann</span>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <RotateCcw size={16} />
              <span>Wiederherstellen</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors">
              <Trash2 size={16} />
              <span>Endgültig löschen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
