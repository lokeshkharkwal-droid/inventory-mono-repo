import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { MasterSettingService } from './master-setting.service';
import { UpdateMasterSettingDto } from './dto/master-setting.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * SiteAdmin-managed inventory master settings (platform-level singleton). Every
 * route requires a SiteAdmin token (`@Public()` bypasses the global business
 * guard; {@link SiteAdminGuard} enforces the SiteAdmin token).
 */
@Controller('master-settings')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterSettingController {
  constructor(private readonly service: MasterSettingService) {}

  @Get()
  get() {
    return this.service.getSettings();
  }

  @Put()
  update(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: UpdateMasterSettingDto,
  ) {
    return this.service.updateSettings(dto, by);
  }
}
