export const qk = {
  adminUsers: (sessionId) => ['admin', 'users', sessionId ?? null],
  adminUsersRoot: () => ['admin', 'users'],

  tasksList: (sessionId, filterType, searchQuery) => [
    'tasks',
    'list',
    sessionId ?? null,
    filterType,
    searchQuery,
  ],
  tasksListRoot: () => ['tasks', 'list'],

  tasksTrash: (sessionId) => ['tasks', 'trash', sessionId ?? null],
  tasksTrashRoot: () => ['tasks', 'trash'],

  dashboard: (sessionId) => ['dashboard', sessionId ?? null],
  dashboardRoot: () => ['dashboard'],
}
