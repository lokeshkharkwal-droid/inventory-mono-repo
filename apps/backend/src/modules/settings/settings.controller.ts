import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

/**
 * Inventory settings endpoints — branch-scoped. The active branch is read from
 * the caller's JWT (`@CurrentProfile`), never from the request body, so a user
 * can only ever read/write the settings of a branch they are authorized for.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ) {
    return this.settingsService.get(tenantId, profile.branchId);
  }

  @Put()
  @RequirePermission('inventory:settings__manage')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.update(tenantId, profile.branchId, dto);
  }
}
