import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MasterProformaService } from './master-proforma.service';
import {
  MasterProformaQueryDto,
  CreateMasterProformaDto,
  UpdateMasterProformaDto,
} from './dto/master-proforma.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * SiteAdmin-managed master proformas (reusable line-item templates). Every route
 * requires a SiteAdmin token (`@Public()` bypasses the global business guard;
 * {@link SiteAdminGuard} enforces the SiteAdmin token). Platform-level.
 */
@Controller('master-proformas')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterProformaController {
  constructor(private readonly service: MasterProformaService) {}

  @Get()
  list(@Query() q: MasterProformaQueryDto) {
    return this.service.listProformas(q);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getProforma(id);
  }

  @Post()
  create(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterProformaDto,
  ) {
    return this.service.createProforma(dto, by);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMasterProformaDto) {
    return this.service.updateProforma(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.removeProforma(id);
  }
}
