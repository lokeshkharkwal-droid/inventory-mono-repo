import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProformaService } from './proforma.service';
import {
  CreateProformaDto,
  ProformaQueryDto,
  UpdateProformaStatusDto,
} from './dto/proforma.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Proforma endpoints (tenant-scoped via the JWT). */
@Controller('proformas')
export class ProformaController {
  constructor(private readonly proformaService: ProformaService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateProformaDto,
  ) {
    return this.proformaService.create(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: ProformaQueryDto) {
    return this.proformaService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.proformaService.findById(id, tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProformaStatusDto,
  ) {
    return this.proformaService.updateStatus(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.proformaService.remove(id, tenantId);
  }
}
