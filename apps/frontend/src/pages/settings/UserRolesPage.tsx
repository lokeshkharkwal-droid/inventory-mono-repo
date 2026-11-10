import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Trash2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useRoles,
  useUserRoles,
  useAssignableUsers,
  useAssignUserRole,
  useUnassignUserRole,
  type UserRoleView,
} from '@/features/permissions/api';

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * Assign inventory roles to specific users. An assignment overrides the user's
 * kalnostics profile for inventory authorization (admins stay full-access).
 */
export function UserRolesPage() {
  const { data: roles } = useRoles();
  const { data: assignments } = useUserRoles();
  const [search, setSearch] = useState('');
  const { data: users } = useAssignableUsers(search);
  const assign = useAssignUserRole();
  const unassign = useUnassignUserRole();

  const [personId, setPersonId] = useState('');
  const [roleKey, setRoleKey] = useState('');

  // Assignable roles exclude locked superuser roles (they're always full-access).
  const assignableRoles = useMemo(
    () => (roles ?? []).filter((r) => !r.isSuperuser),
    [roles],
  );

  const onAssign = async () => {
    if (!personId || !roleKey) {
      toast.error('Pick a user and a role.');
      return;
    }
    try {
      await assign.mutateAsync({ personId, roleKey });
      toast.success('Role assigned.');
      setPersonId('');
      setRoleKey('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not assign role'));
    }
  };

  const userName = (pid: string) =>
    users?.find((u) => u.personId === pid)?.name ?? pid;

  const columns: Column<UserRoleView>[] = [
    { key: 'personId', header: 'User', render: (r) => userName(r.personId) },
    { key: 'roleLabel', header: 'Assigned role' },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-px',
      render: (r) => (
        <Button
          variant="ghost"
          size="icon"
          title="Remove assignment"
          onClick={async () => {
            try {
              await unassign.mutateAsync(r.personId);
              toast.success('Assignment removed.');
            } catch (err) {
              toast.error(getApiErrorMessage(err, 'Could not remove'));
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="h-6 w-6" /> User roles
          </h1>
          <p className="text-sm text-muted-foreground">
            Give a specific user a role. This overrides their login profile for
            inventory access.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/roles">
            <ShieldCheck className="h-4 w-4" /> Manage roles
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">User</label>
            <Input
              placeholder="Search staff by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={selectCls}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">Select a user…</option>
              {(users ?? []).map((u) => (
                <option key={u.personId} value={u.personId}>
                  {u.name}
                  {u.username ? ` (${u.username})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select
              className={selectCls}
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
            >
              <option value="">Select a role…</option>
              {assignableRoles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                  {!r.isSystem ? ' (custom)' : ''}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onAssign} disabled={assign.isPending}>
            Assign role
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={assignments ?? []}
        rowKey={(r) => r.personId}
        emptyMessage="No user role assignments yet."
      />
    </div>
  );
}
