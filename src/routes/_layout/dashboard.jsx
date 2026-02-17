import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../__root';
import { getDashboardData } from '../../server/task-functions';

export const Route = createFileRoute('/_layout/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useAuth();

  /**
   * TanStack Query für Dashboard
   * ============================
   * Holt Statistiken und Aktivitäten direkt aus der DB
   * über eine Server Function.
   */
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', session?.sessionId ?? null],
    enabled: Boolean(session?.sessionId),
    queryFn: () =>
      getDashboardData({
        data: {
          sessionId: session?.sessionId,
        },
      }),
    staleTime: 60 * 1000,
  });

  const stats = dashboardQuery.data?.stats || {
    open: 0,
    inProgress: 0,
    done: 0,
  };

  const activities = dashboardQuery.data?.activities || [];

  function formatRelativeDate(value) {
    if (!value) return '—';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) return 'Heute';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  function getActivityColor(status) {
    if (status === 'Erledigt') return 'bg-green-500';
    if (status === 'in Arbeit') return 'bg-yellow-500';
    return 'bg-blue-500';
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Übersicht über Aufgaben aus der Datenbank</p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Offene Aufgaben */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Offene Aufgaben</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.open}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Status: Neu</p>
        </div>

        {/* In Bearbeitung */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">In Bearbeitung</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Status: in Arbeit</p>
        </div>

        {/* Abgeschlossen */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Abgeschlossen</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.done}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Status: Erledigt</p>
        </div>
      </div>

      {/* Kürzliche Aktivitäten */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kürzliche Aktivitäten</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {dashboardQuery.isLoading ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Dashboard wird geladen...</div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Keine Aktivitäten vorhanden.</div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.status)}`}></div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Aufgabe <span className="font-medium">"{activity.title}"</span> (Status: {activity.status})
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{formatRelativeDate(activity.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
