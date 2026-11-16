import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  ALL_PERMISSIONS,
  MANAGEABLE_ROLES,
  SUPERUSER_PROFILES,
  resolvePermissions,
} from './constants/permission-catalog.constant';

/** A role plus its effective permission set, for the admin screen. */
export interface RolePermissionView {
  key: string;
  label: string;
  /** Built-in profile key (true) vs. admin-created custom role (false). */
  isSystem: boolean;
  /** Superuser roles always have full access and cannot be edited. */
  isSuperuser: boolean;
  permissions: string[];
  /** For system roles: a tenant override exists. For custom: always true. */
  isCustomised: boolean;
}

/** An inventory-side user→role assignment. */
export interface UserRoleView {
  personId: string;
  roleKey: string;
  roleLabel: string;
}

/**
 * Resolves and manages per-tenant RBAC: built-in role permission overrides,
 * admin-created custom roles, and user→role assignments. Resolution precedence
 * for a request: superuser JWT profile → full; else a user assignment (by
 * person) → that role; else the JWT profile's override/baseline.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the permission set for a role key (custom role or built-in). */
  private async permissionsForRole(
    tenantId: string,
    roleKey: string,
  ): Promise<string[]> {
    const custom = await this.prisma.inventoryRole.findUnique({
      where: { tenantId_key: { tenantId, key: roleKey } },
    });
    if (custom) return custom.permissions;
    if (SUPERUSER_PROFILES.has(roleKey)) return ALL_PERMISSIONS;
    const override = await this.prisma.inventoryRolePermission.findUnique({
      where: { tenantId_profileKey: { tenantId, profileKey: roleKey } },
    });
    if (override) return override.permissions;
    return resolvePermissions(roleKey);
  }

  /**
   * Effective permission keys for a request: superuser profile → all; else a
   * user assignment (by person) → that role; else the profile's override/baseline.
   */
  async resolveEffective(
    tenantId: string,
    personId: string | null | undefined,
    profileKey: string | null | undefined,
  ): Promise<string[]> {
    // Admins keep full access regardless of any assignment (anti-lockout).
    if (profileKey && SUPERUSER_PROFILES.has(profileKey)) {
      return ALL_PERMISSIONS;
    }
    if (personId) {
      const assignment = await this.prisma.inventoryUserRole.findUnique({
        where: { tenantId_personId: { tenantId, personId } },
      });
      if (assignment) {
        return this.permissionsForRole(tenantId, assignment.roleKey);
      }
    }
    if (profileKey) {
      return this.permissionsForRole(tenantId, profileKey);
    }
    return resolvePermissions(profileKey);
  }

  /** List built-in + custom roles with their effective permissions. */
  async listRoles(tenantId: string): Promise<RolePermissionView[]> {
    const [overrides, customRoles] = await Promise.all([
      this.prisma.inventoryRolePermission.findMany({ where: { tenantId } }),
      this.prisma.inventoryRole.findMany({
        where: { tenantId },
        orderBy: { label: 'asc' },
      }),
    ]);
    const overrideByKey = new Map(
      overrides.map((o) => [o.profileKey, o.permissions]),
    );
    const system: RolePermissionView[] = MANAGEABLE_ROLES.map((role) => {
      if (role.isSuperuser) {
        return {
          key: role.key,
          label: role.label,
          isSystem: true,
          isSuperuser: true,
          permissions: ALL_PERMISSIONS,
          isCustomised: false,
        };
      }
      const override = overrideByKey.get(role.key);
      return {
        key: role.key,
        label: role.label,
        isSystem: true,
        isSuperuser: false,
        permissions: override ?? resolvePermissions(role.key),
        isCustomised: override !== undefined,
      };
    });
    const custom: RolePermissionView[] = customRoles.map((r) => ({
      key: r.key,
      label: r.label,
      isSystem: false,
      isSuperuser: false,
      permissions: r.permissions,
      isCustomised: true,
    }));
    return [...system, ...custom];
  }

  /** Create a custom role from a label (+ optional starting permissions). */
  async createRole(
    tenantId: string,
    label: string,
    permissions: string[] = [],
  ): Promise<RolePermissionView> {
    const trimmed = label.trim();
    if (!trimmed) {
      throw new KaltrosException(
        'INVALID_ROLE_LABEL',
        'Role name is required.',
        {},
        HttpStatus.BAD_REQUEST,
      );
    }
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const key = `custom_${slug || 'role'}`;
    // Guard against colliding with a built-in key or an existing custom role.
    if (MANAGEABLE_ROLES.some((r) => r.key === key)) {
      throw new KaltrosException(
        'ROLE_KEY_RESERVED',
        'That role name collides with a built-in role.',
        { key },
        HttpStatus.CONFLICT,
      );
    }
    const existing = await this.prisma.inventoryRole.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (existing) {
      throw new KaltrosException(
        'ROLE_ALREADY_EXISTS',
        'A role with that name already exists.',
        { key },
        HttpStatus.CONFLICT,
      );
    }
    const cleaned = this.validatePermissions(permissions);
    const created = await this.prisma.inventoryRole.create({
      data: { tenantId, key, label: trimmed, permissions: cleaned },
    });
    return {
      key: created.key,
      label: created.label,
      isSystem: false,
      isSuperuser: false,
      permissions: created.permissions,
      isCustomised: true,
    };
  }

  /**
   * Set a role's permission set. Works for built-in non-superuser roles (stored
   * as an override) and for custom roles.
   */
  async setRolePermissions(
    tenantId: string,
    roleKey: string,
    permissions: string[],
    label?: string,
  ): Promise<RolePermissionView> {
    const cleaned = this.validatePermissions(permissions);
    const custom = await this.prisma.inventoryRole.findUnique({
      where: { tenantId_key: { tenantId, key: roleKey } },
    });
    if (custom) {
      const updated = await this.prisma.inventoryRole.update({
        where: { tenantId_key: { tenantId, key: roleKey } },
        data: {
          permissions: cleaned,
          ...(label ? { label: label.trim() } : {}),
        },
      });
      return {
        key: updated.key,
        label: updated.label,
        isSystem: false,
        isSuperuser: false,
        permissions: updated.permissions,
        isCustomised: true,
      };
    }
    const role = MANAGEABLE_ROLES.find((r) => r.key === roleKey);
    if (!role) {
      throw new KaltrosException(
        'ROLE_NOT_FOUND',
        `Unknown role '${roleKey}'.`,
        { roleKey },
        HttpStatus.NOT_FOUND,
      );
    }
    if (role.isSuperuser) {
      throw new KaltrosException(
        'ROLE_NOT_EDITABLE',
        'Superuser roles always have full access and cannot be edited.',
        { roleKey },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.inventoryRolePermission.upsert({
      where: { tenantId_profileKey: { tenantId, profileKey: roleKey } },
      create: { tenantId, profileKey: roleKey, permissions: cleaned },
      update: { permissions: cleaned },
    });
    return {
      key: role.key,
      label: role.label,
      isSystem: true,
      isSuperuser: false,
      permissions: cleaned,
      isCustomised: true,
    };
  }

  /**
   * Delete a custom role (and its assignments) or reset a built-in role to its
   * code baseline.
   */
  async deleteOrResetRole(
    tenantId: string,
    roleKey: string,
  ): Promise<{ deleted: boolean }> {
    const custom = await this.prisma.inventoryRole.findUnique({
      where: { tenantId_key: { tenantId, key: roleKey } },
    });
    if (custom) {
      await this.prisma.withTenant(tenantId, async (tx) => {
        await tx.inventoryUserRole.deleteMany({
          where: { tenantId, roleKey },
        });
        await tx.inventoryRole.delete({
          where: { tenantId_key: { tenantId, key: roleKey } },
        });
      });
      return { deleted: true };
    }
    await this.prisma.inventoryRolePermission.deleteMany({
      where: { tenantId, profileKey: roleKey },
    });
    return { deleted: false };
  }

  /** List user→role assignments for the tenant. */
  async listUserRoles(tenantId: string): Promise<UserRoleView[]> {
    const [assignments, roles] = await Promise.all([
      this.prisma.inventoryUserRole.findMany({ where: { tenantId } }),
      this.listRoles(tenantId),
    ]);
    const labelByKey = new Map(roles.map((r) => [r.key, r.label]));
    return assignments.map((a) => ({
      personId: a.personId,
      roleKey: a.roleKey,
      roleLabel: labelByKey.get(a.roleKey) ?? a.roleKey,
    }));
  }

  /** Assign (or re-assign) a role to a user. */
  async assignUserRole(
    tenantId: string,
    personId: string,
    roleKey: string,
  ): Promise<UserRoleView> {
    const roles = await this.listRoles(tenantId);
    const role = roles.find((r) => r.key === roleKey);
    if (!role) {
      throw new KaltrosException(
        'ROLE_NOT_FOUND',
        `Unknown role '${roleKey}'.`,
        { roleKey },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.inventoryUserRole.upsert({
      where: { tenantId_personId: { tenantId, personId } },
      create: { tenantId, personId, roleKey },
      update: { roleKey },
    });
    return { personId, roleKey, roleLabel: role.label };
  }

  /** Remove a user's role assignment (reverts to their JWT profile). */
  async unassignUserRole(
    tenantId: string,
    personId: string,
  ): Promise<{ removed: boolean }> {
    const res = await this.prisma.inventoryUserRole.deleteMany({
      where: { tenantId, personId },
    });
    return { removed: res.count > 0 };
  }

  /** Validate a permission-key array against the catalogue. */
  private validatePermissions(permissions: string[]): string[] {
    const valid = new Set(ALL_PERMISSIONS);
    const invalid = permissions.filter((p) => !valid.has(p));
    if (invalid.length) {
      throw new KaltrosException(
        'INVALID_PERMISSION_KEYS',
        'One or more permission keys are not recognised.',
        { invalid },
        HttpStatus.BAD_REQUEST,
      );
    }
    return [...new Set(permissions)];
  }
}
