import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface PermissionSection {
  key: string;
  label: string;
  actions: { action: string; label: string }[];
}

interface MePermissions {
  profileKey: string | null;
  permissions: string[];
}

/** Build a permission key: `inventory:<section>__<action>`. */
export const permKey = (section: string, action: string) =>
  `inventory:${section}__${action}`;

/** The full permission catalogue (for the matrix view). */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permissions', 'catalog'],
    queryFn: () => request<PermissionSection[]>('GET', '/permissions/catalog'),
    staleTime: 10 * 60_000,
  });
}

/**
 * The current session's effective permissions plus a `can(key)` helper. Used to
 * disable (not hide) controls the user may not use.
 */
export function usePermissions() {
  const query = useQuery({
    queryKey: ['permissions', 'me'],
    queryFn: () => request<MePermissions>('GET', '/permissions/me'),
    staleTime: 10 * 60_000,
  });
  const set = useMemo(
    () => new Set(query.data?.permissions ?? []),
    [query.data],
  );
  return {
    profileKey: query.data?.profileKey ?? null,
    permissions: set,
    isLoading: query.isLoading,
    /** True if the session holds the given permission key. */
    can: (key: string) => set.has(key),
  };
}

// ── Role-permission management (admin) ───────────────────────────────────────
export interface RolePermissionView {
  key: string;
  label: string;
  /** Built-in profile (true) vs. admin-created custom role (false). */
  isSystem: boolean;
  isSuperuser: boolean;
  permissions: string[];
  isCustomised: boolean;
}

const invalidateRbac = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['permissions', 'roles'] });
  qc.invalidateQueries({ queryKey: ['permissions', 'user-roles'] });
  qc.invalidateQueries({ queryKey: ['permissions', 'me'] });
};

/** List every role (built-in + custom) + its effective permissions. */
export function useRoles() {
  return useQuery({
    queryKey: ['permissions', 'roles'],
    queryFn: () => request<RolePermissionView[]>('GET', '/permissions/roles'),
  });
}

/** Create a custom role from a display name (+ optional starting permissions). */
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { label: string; permissions?: string[] }) =>
      request<RolePermissionView>('POST', '/permissions/roles', { body }),
    onSuccess: () => invalidateRbac(qc),
  });
}

/** Grant/replace a role's permission set (and optionally rename a custom role). */
export function useSetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      permissions,
      label,
    }: {
      key: string;
      permissions: string[];
      label?: string;
    }) =>
      request<RolePermissionView>('PUT', `/permissions/roles/${key}`, {
        body: { permissions, label },
      }),
    onSuccess: () => invalidateRbac(qc),
  });
}

/** Delete a custom role, or reset a built-in role to its code baseline. */
export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      request<{ deleted: boolean }>('DELETE', `/permissions/roles/${key}`),
    onSuccess: () => invalidateRbac(qc),
  });
}

// ── User → role assignments ──────────────────────────────────────────────────
export interface UserRoleView {
  personId: string;
  roleKey: string;
  roleLabel: string;
}
export interface AssignableUser {
  personId: string;
  name: string;
  username: string | null;
  email: string | null;
}

/** Current inventory-side user→role assignments. */
export function useUserRoles() {
  return useQuery({
    queryKey: ['permissions', 'user-roles'],
    queryFn: () => request<UserRoleView[]>('GET', '/permissions/user-roles'),
  });
}

/** Staff users (from kalnostics) available for role assignment. */
export function useAssignableUsers(search: string) {
  return useQuery({
    queryKey: ['permissions', 'assignable-users', search],
    queryFn: () =>
      request<AssignableUser[]>('GET', '/permissions/assignable-users', {
        query: { search: search || undefined },
      }),
  });
}

/** Assign a role to a user. */
export function useAssignUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { personId: string; roleKey: string }) =>
      request<UserRoleView>('POST', '/permissions/user-roles', { body }),
    onSuccess: () => invalidateRbac(qc),
  });
}

/** Remove a user's role assignment. */
export function useUnassignUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) =>
      request<{ removed: boolean }>(
        'DELETE',
        `/permissions/user-roles/${personId}`,
      ),
    onSuccess: () => invalidateRbac(qc),
  });
}
