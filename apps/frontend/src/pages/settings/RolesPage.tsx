import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, RotateCcw, Save, Plus, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import {
  usePermissionCatalog,
  useRoles,
  useCreateRole,
  useSetRolePermissions,
  useDeleteRole,
  permKey,
  type RolePermissionView,
} from '@/features/permissions/api';

const selectCls =
  'flex h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * Admin RBAC screen: create custom roles and grant/revoke permissions per role.
 * Superuser roles always have full access and are read-only (anti-lockout).
 * Changes are per-tenant and take effect immediately. Assign roles to users on
 * the User roles screen.
 */
export function RolesPage() {
  const { data: catalog } = usePermissionCatalog();
  const { data: roles } = useRoles();
  const createRole = useCreateRole();
  const setRole = useSetRolePermissions();
  const deleteRole = useDeleteRole();

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const selected: RolePermissionView | undefined = useMemo(
    () => roles?.find((r) => r.key === selectedKey),
    [roles, selectedKey],
  );

  useEffect(() => {
    if (!selectedKey && roles && roles.length) {
      const firstEditable = roles.find((r) => !r.isSuperuser) ?? roles[0];
      setSelectedKey(firstEditable!.key);
    }
  }, [roles, selectedKey]);

  useEffect(() => {
    if (selected) setChecked(new Set(selected.permissions));
  }, [selected]);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleSection = (sectionKey: string, actions: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const a of actions) {
        const k = permKey(sectionKey, a);
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  const locked = !selected || selected.isSuperuser;

  const onSave = async () => {
    if (!selected || selected.isSuperuser) return;
    try {
      await setRole.mutateAsync({ key: selected.key, permissions: [...checked] });
      toast.success(`Saved permissions for ${selected.label}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save permissions'));
    }
  };

  const onDeleteOrReset = async () => {
    if (!selected || selected.isSuperuser) return;
    const isCustom = !selected.isSystem;
    try {
      const res = await deleteRole.mutateAsync(selected.key);
      toast.success(
        res.deleted
          ? `Deleted role ${selected.label}.`
          : `${selected.label} reset to default.`,
      );
      if (isCustom) setSelectedKey('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update role'));
    }
  };

  const onCreate = async () => {
    if (!newLabel.trim()) {
      toast.error('Enter a role name.');
      return;
    }
    try {
      const role = await createRole.mutateAsync({ label: newLabel.trim() });
      toast.success(`Created role ${role.label}.`);
      setNewOpen(false);
      setNewLabel('');
      setSelectedKey(role.key);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create role'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="h-6 w-6" /> Roles &amp; permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Create roles and grant each one exactly what it can do. Changes apply
            immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/user-roles">
              <Users className="h-4 w-4" /> Assign to users
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Role</label>
          <select
            className={selectCls}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {(roles ?? []).map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
                {r.isSuperuser ? ' — full access (locked)' : ''}
                {!r.isSystem ? ' • custom' : r.isCustomised ? ' • customised' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDeleteOrReset}
            disabled={
              locked ||
              deleteRole.isPending ||
              (selected?.isSystem && !selected?.isCustomised)
            }
            title={
              selected && !selected.isSystem
                ? 'Delete custom role'
                : 'Reset to default'
            }
          >
            {selected && !selected.isSystem ? (
              <>
                <Trash2 className="h-4 w-4" /> Delete role
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" /> Reset to default
              </>
            )}
          </Button>
          <Button onClick={onSave} disabled={locked || setRole.isPending}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {selected?.isSuperuser && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{selected.label}</strong> is an administrator role — it always
          has full access and cannot be edited (prevents lock-out).
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(catalog ?? []).map((section) => {
          const actionKeys = section.actions.map((a) => a.action);
          const allOn = actionKeys.every((a) =>
            checked.has(permKey(section.key, a)),
          );
          return (
            <Card key={section.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{section.label}</CardTitle>
                <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allOn}
                    disabled={locked}
                    onChange={(e) =>
                      toggleSection(section.key, actionKeys, e.target.checked)
                    }
                  />
                  All
                </label>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {section.actions.map((a) => {
                  const k = permKey(section.key, a.action);
                  return (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked.has(k)}
                        disabled={locked}
                        onChange={() => toggle(k)}
                      />
                      {a.label}
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Warehouse Clerk"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onCreate();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Starts with no permissions — tick what it can do, then Save.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={createRole.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
