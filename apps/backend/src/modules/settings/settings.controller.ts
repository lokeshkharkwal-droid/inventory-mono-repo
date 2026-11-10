import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

/** Inventory settings endpoints (tenant-scoped singleton). */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@CurrentTenant() tenantId: string) {
    return this.settingsService.get(tenantId);
  }

  @Put()
  @RequirePermission('inventory:settings__manage')
  update(@CurrentTenant() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(tenantId, dto);
  }
}
