import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';

/**
 * Liveness + a protected "whoami" probe that proves the three foundations work
 * end-to-end: (1) kalnostics JWT validation, (2) tenant context, and
 * (3) the kalnostics-new integration client.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly branches: KalnosticsBranchClient) {}

  /** Unauthenticated liveness check. */
  @Public()
  @Get()
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'inventory-backend',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Authenticated probe. Echoes the resolved identity and calls kalnostics-new
   * to list inventory branches (warehouses), proving token forwarding works.
   */
  @Get('whoami')
  async whoami(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ): Promise<{
    personId: string;
    tenantId: string;
    activeBranchId: string | null;
    activeProfileKey: string | null;
    profileCount: number;
    inventoryBranchCount: number;
  }> {
    const inventoryBranches = await this.branches.getOptions({
      branchType: 'INVENTORY',
    });
    return {
      personId: user.person_id,
      tenantId,
      activeBranchId: profile.branchId,
      activeProfileKey: profile.profileKey,
      profileCount: user.profiles?.length ?? 0,
      inventoryBranchCount: inventoryBranches.length,
    };
  }
}
