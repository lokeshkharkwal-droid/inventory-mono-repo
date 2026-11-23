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
  CreateProformaRelationDto,
  ProformaQueryDto,
  ProformaRelationQueryDto,
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

  /** One proforma + created-by / customer names (details modal, edit prefill). */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.proformaService.getDetail(id, tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProformaStatusDto,
  ) {
    return this.proformaService.updateStatus(id, tenantId, dto);
  }

  /** Full edit of a proforma (EZHT `proformas/edit`). */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateProformaDto,
  ) {
    return this.proformaService.update(id, tenantId, dto, personId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.proformaService.remove(id, tenantId);
  }

  // ── Mappings (Lab Test / Branch / …) ─────────────────────────────────────────

  /** List a proforma's entity mappings, optionally filtered by `?type=`. */
  @Get(':id/relations')
  listRelations(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Query() query: ProformaRelationQueryDto,
  ) {
    return this.proformaService.listRelations(id, tenantId, query);
  }

  /** Map a proforma to a lab test / branch (de-duplicated, reactivatable). */
  @Post(':id/relations')
  addRelation(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateProformaRelationDto,
  ) {
    return this.proformaService.addRelation(
      id,
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  /** Remove (soft-delete) a proforma mapping. */
  @Delete(':id/relations/:relationId')
  removeRelation(
    @Param('id') id: string,
    @Param('relationId') relationId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.proformaService.removeRelation(id, relationId, tenantId);
  }
}
