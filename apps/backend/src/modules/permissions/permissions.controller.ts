import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  PERMISSION_SECTIONS,
  SUPERUSER_PROFILES,
} from './constants/permission-catalog.constant';
import { PermissionsService } from './permissions.service';
import { KalnosticsUserClient } from '../integration/kalnostics-user.client';
import {
  AssignUserRoleDto,
  CreateRoleDto,
  SetRolePermissionsDto,
} from './dto/set-role-permissions.dto';

/** Permission catalogue, effective-permission resolution, and RBAC admin. */
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly service: PermissionsService,
    private readonly users: KalnosticsUserClient,
  ) {}

  /** The full catalogue (sections × actions) — drives the admin matrix UI. */
  @Get('catalog')
  catalog() {
    return PERMISSION_SECTIONS;
  }

  /**
   * The current session's effective permission keys (user assignment → tenant
   * override → baseline). The frontend uses this to disable (not hide) controls.
   */
  @Get('me')
  async me(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @CurrentProfile() profile: ActiveProfile,
  ): Promise<{ profileKey: string | null; permissions: string[] }> {
    return {
      profileKey: profile.profileKey,
      permissions: await this.service.resolveEffective(
        tenantId,
        personId,
        profile.profileKey,
      ),
    };
  }

  /** List built-in + custom roles with their effective permissions. */
  @Get('roles')
  listRoles(@CurrentTenant() tenantId: string) {
    return this.service.listRoles(tenantId);
  }

  /** Create a custom role (superuser profiles only). */
  @Post('roles')
  createRole(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateRoleDto,
  ) {
    this.assertCanManageRoles(profile);
    return this.service.createRole(tenantId, dto.label, dto.permissions ?? []);
  }

  /** Grant/replace a role's permission set (superuser profiles only). */
  @Put('roles/:roleKey')
  setRole(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Param('roleKey') roleKey: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    this.assertCanManageRoles(profile);
    return this.service.setRolePermissions(
      tenantId,
      roleKey,
      dto.permissions,
      dto.label,
    );
  }

  /** Delete a custom role or reset a built-in role to default (superuser only). */
  @Delete('roles/:roleKey')
  deleteRole(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Param('roleKey') roleKey: string,
  ) {
    this.assertCanManageRoles(profile);
    return this.service.deleteOrResetRole(tenantId, roleKey);
  }

  /** List user→role assignments for this tenant. */
  @Get('user-roles')
  listUserRoles(@CurrentTenant() tenantId: string) {
    return this.service.listUserRoles(tenantId);
  }

  /** Assign a role to a user (superuser profiles only). */
  @Post('user-roles')
  assignUserRole(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: AssignUserRoleDto,
  ) {
    this.assertCanManageRoles(profile);
    return this.service.assignUserRole(tenantId, dto.personId, dto.roleKey);
  }

  /** Remove a user's role assignment (superuser profiles only). */
  @Delete('user-roles/:personId')
  unassignUserRole(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Param('personId') personId: string,
  ) {
    this.assertCanManageRoles(profile);
    return this.service.unassignUserRole(tenantId, personId);
  }

  /** Staff picker for role assignment (proxied from kalnostics identity). */
  @Get('assignable-users')
  assignableUsers(
    @CurrentProfile() profile: ActiveProfile,
    @Headers('authorization') authorization: string,
    @Query('search') search?: string,
  ) {
    this.assertCanManageRoles(profile);
    return this.users.listUsers(authorization, search);
  }

  /** Only superuser profiles (business_admin/owner/…) may administer RBAC. */
  private assertCanManageRoles(profile: ActiveProfile): void {
    if (!profile.profileKey || !SUPERUSER_PROFILES.has(profile.profileKey)) {
      throw new KaltrosException(
        'FORBIDDEN_ROLE_MANAGEMENT',
        'Only an administrator may change roles or permissions.',
        { profileKey: profile.profileKey },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
