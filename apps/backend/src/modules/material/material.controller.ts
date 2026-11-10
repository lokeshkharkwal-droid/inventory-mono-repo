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
import { MaterialService } from './material.service';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryDto,
  CreateMaterialDamageDto,
  CreateMaterialRepairDto,
  ImportMaterialsDto,
} from './dto/material.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Material endpoints (+ damage/repair sub-resources), tenant-scoped. */
@Controller('materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.materialService.create(tenantId, profile.branchId, dto);
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: ImportMaterialsDto,
  ) {
    return this.materialService.import(tenantId, profile.branchId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: MaterialQueryDto) {
    return this.materialService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.materialService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.materialService.remove(id, tenantId);
  }

  @Post(':id/damages')
  addDamage(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateMaterialDamageDto,
  ) {
    return this.materialService.addDamage(id, tenantId, dto, personId);
  }

  @Post(':id/repairs')
  addRepair(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateMaterialRepairDto,
  ) {
    return this.materialService.addRepair(id, tenantId, dto, personId);
  }
}
