import { createFileRoute, redirect } from '@tanstack/react-router';
import { UserPlus, Mail, Shield, X, CheckCircle2, PenSquare, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { getSessionInfo } from '../../../server/auth-functions';
import { createUser, deleteUser, getUsersForAdmin, updateUser } from '../../../server/user-functions';
import { useAuth } from '../../__root';

/**
 * Route-Schutz in TanStack Router - beforeLoad Guard
 * ===================================================
 * 
 * Die beforeLoad-Funktion wird VOR dem Rendern der Komponente aufgerufen.
 * Sie kann:
 * 1. Daten vorausladen (Pre-fetching)
 * 2. Authentifizierung/Autorisierung prüfen
 * 3. Die Navigation blockieren oder umleiten
 * 
 * Wenn die Funktion einen Fehler wirft oder navigiert,
 * wird die Komponente NICHT gerendert.
 * 
 * Warum beforeLoad und nicht direkt in der Komponente?
 * -------------------------------------------------------
 * 1. **Server-seitig erzwingbar**: Bei SSR kann beforeLoad auf dem Server
 *    ausgeführt werden, BEVOR HTML gesendet wird
 * 2. **Early Exit**: Navigation passiert vor Code-Splitting
 * 3. **Konsistenz**: Schützt die Route unabhängig vom Client
 * 4. **Performance**: Lädt geschützte Ressourcen nicht unnötig
 * 
 * Beispiel:
 * ```
 * beforeLoad: () => {
 *   const session = await getSessionInfo()
 *   if (!session?.authenticated || session.role !== 'admin') {
 *     throw redirect({ to: '/login' })
 *   }
 * }
 * ```
 * 
 * Datei-basiertes Routing (Admin-Bereich)
 * Pfad der Datei: src/routes/_layout/admin/nutzer.jsx
 * Daraus wird automatisch die URL: /admin/nutzer
 * 
 * Diese Route ist Teil des Admin-Bereichs und liegt im
 * admin-Unterordner, wodurch sie automatisch unter /admin/
 * gruppiert wird.
 */

export const Route = createFileRoute('/_layout/admin/nutzer')({
  component: AdminNutzerPage,
  /**
   * beforeLoad: Schutz-Gate vor dem Rendern
   * 
   * Diese Funktion wird aufgerufen, BEVOR die Komponente gerendert wird.
   * Serverseitig: Session wird im Server Function geprüft.
   */
  beforeLoad: async () => {
    const sessionId =
      typeof document !== 'undefined'
        ? document.cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('task_session='))
            ?.split('=')[1] || null
        : null;

    const session = await getSessionInfo({ data: { sessionId } });

    if (!session?.authenticated || session.role !== 'admin') {
      throw redirect({ to: '/login' });
    }
  },
});

function AdminNutzerPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [sorting, setSorting] = useState([]);

  function formatRole(role) {
    return role === 'admin' ? 'Admin' : 'User';
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', session?.sessionId ?? null],
    enabled: Boolean(session?.sessionId),
    queryFn: async () => {
      const rows = await getUsersForAdmin({
        data: {
          sessionId: session?.sessionId,
        },
      });

      return (rows || []).map((item) => ({
        ...item,
        roleLabel: formatRole(item.role),
        lastActiveLabel: formatDate(item.updatedAt),
      }));
    },
    staleTime: 60 * 1000,
  });

  const users = usersQuery.data || [];

  const addUserMutation = useMutation({
    mutationFn: async (payload) => createUser({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setFeedbackMessage(result?.error || 'Nutzer konnte nicht angelegt werden.');
        return;
      }
      setShowAddUserModal(false);
      setFeedbackMessage(`Nutzer ${variables.name} wurde erfolgreich hinzugefügt.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload) => updateUser({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setFeedbackMessage(result?.error || 'Nutzer konnte nicht aktualisiert werden.');
        return;
      }
      setShowEditUserModal(false);
      setEditingUser(null);
      setFeedbackMessage(`Nutzer ${variables.name} wurde gespeichert.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (payload) => deleteUser({ data: payload }),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setFeedbackMessage(result?.error || 'Nutzer konnte nicht gelöscht werden.');
        return;
      }
      setFeedbackMessage(`Nutzer ${variables.name} wurde gelöscht.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (email) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return email;
    },
    onSuccess: (email) => {
      setShowInviteModal(false);
      setFeedbackMessage(`Einladung wurde an ${email} versendet.`);
    },
  });

  const addUserForm = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
    },
    onSubmit: async ({ value }) => {
      await addUserMutation.mutateAsync({
        sessionId: session?.sessionId,
        name: value.name,
        email: value.email,
        role: value.role,
      });
      addUserForm.reset();
    },
  });

  const editUserForm = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
    },
    onSubmit: async ({ value }) => {
      if (!editingUser) return;

      await updateUserMutation.mutateAsync({
        sessionId: session?.sessionId,
        userId: editingUser.id,
        name: value.name,
        email: value.email,
        role: value.role,
      });
    },
  });

  const inviteForm = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      await sendInviteMutation.mutateAsync(value.email);
      inviteForm.reset();
    },
  });

  function openEditUser(user) {
    setEditingUser(user);
    editUserForm.setFieldValue('name', user.name);
    editUserForm.setFieldValue('email', user.email);
    editUserForm.setFieldValue('role', user.role);
    setShowEditUserModal(true);
    setFeedbackMessage('');
  }

  async function handleDeleteUser(user) {
    const shouldDelete = window.confirm(`Nutzer ${user.name} wirklich löschen?`);
    if (!shouldDelete) return;

    await deleteUserMutation.mutateAsync({
      sessionId: session?.sessionId,
      userId: user.id,
      name: user.name,
    });
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Nutzer',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
              {row.original.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'tasksCount',
      header: 'Aufgaben',
      cell: ({ getValue }) => <span className="text-gray-700 dark:text-gray-300">{getValue()}</span>,
    },
    {
      accessorKey: 'roleLabel',
      header: 'Rolle',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
            row.original.role === 'admin'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {row.original.role === 'admin' && <Shield size={12} />}
          {row.original.roleLabel}
        </span>
      ),
    },
    {
      accessorKey: 'lastActiveLabel',
      header: 'Zuletzt aktiv',
      cell: ({ getValue }) => <span className="text-gray-600 dark:text-gray-400 text-sm">{getValue()}</span>,
    },
    {
      id: 'actions',
      header: 'Aktionen',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={() => openEditUser(row.original)}
            className="text-blue-600 hover:text-blue-800"
            aria-label="Nutzer bearbeiten"
          >
            <PenSquare size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteUser(row.original)}
            className="text-red-600 hover:text-red-800"
            aria-label="Nutzer löschen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutzer verwalten</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Verwalte Benutzer und deren Berechtigungen
        </p>
      </div>

      {feedbackMessage && (
        <div className="mb-4 p-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
          <CheckCircle2 size={16} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => {
            addUserForm.reset();
            setFeedbackMessage('');
            setShowAddUserModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <UserPlus size={18} />
          <span>Nutzer hinzufügen</span>
        </button>
        <button
          onClick={() => {
            setFeedbackMessage('');
            setShowInviteModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          <Mail size={18} />
          <span>Einladung senden</span>
        </button>
      </div>

      {/* Nutzer-Tabelle (TanStack Table mit Sortierung) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300 ${
                      header.column.getCanSort() ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                    } ${header.id === 'actions' ? 'text-right' : ''}`}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className={`flex items-center gap-2 ${header.id === 'actions' ? 'justify-end' : ''}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Nutzer werden geladen...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Keine Nutzer vorhanden.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Nutzer hinzufügen */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddUserModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Neuen Nutzer hinzufügen</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                addUserForm.handleSubmit();
              }}
            >
              <addUserForm.Field
                name="name"
                validators={{ onChange: ({ value }) => (!value ? 'Name ist erforderlich' : undefined) }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z. B. Maria Muster"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </addUserForm.Field>

              <addUserForm.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'E-Mail ist erforderlich';
                    if (!value.includes('@')) return 'Bitte gültige E-Mail eingeben';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="name@firma.de"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </addUserForm.Field>

              <addUserForm.Field name="rolle">
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rolle</label>
                    <select
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
              </addUserForm.Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {addUserMutation.isPending ? 'Speichern...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nutzer bearbeiten */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditUserModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutzer bearbeiten</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                editUserForm.handleSubmit();
              }}
            >
              <editUserForm.Field
                name="name"
                validators={{ onChange: ({ value }) => (!value ? 'Name ist erforderlich' : undefined) }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </editUserForm.Field>

              <editUserForm.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'E-Mail ist erforderlich';
                    if (!value.includes('@')) return 'Bitte gültige E-Mail eingeben';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </editUserForm.Field>

              <editUserForm.Field name="role">
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rolle</label>
                    <select
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
              </editUserForm.Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {updateUserMutation.isPending ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Einladung senden */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Einladung senden</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                inviteForm.handleSubmit();
              }}
            >
              <inviteForm.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'E-Mail ist erforderlich';
                    if (!value.includes('@')) return 'Bitte gültige E-Mail eingeben';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail Adresse</label>
                    <input
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="einladung@firma.de"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </inviteForm.Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sendInviteMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {sendInviteMutation.isPending ? 'Senden...' : 'Senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
