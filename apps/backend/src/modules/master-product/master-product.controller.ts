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
import { MasterProductService } from './master-product.service';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductQueryDto,
  ImportMasterProductsDto,
  MasterProductDrugDto,
} from './dto/master-product.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * Global master-product catalogue.
 *
 * - `/master-products/manage*` — SiteAdmin-only CRUD (the central catalogue).
 *   Guarded by the `'jwt-siteadmin'` strategy; `@Public()` bypasses the global
 *   business guard so the SiteAdmin token is used instead.
 * - `/master-products` + `/master-products/import` — any business user browses
 *   importable masters and imports copies into their own tenant catalogue.
 */
@Controller('master-products')
export class MasterProductController {
  constructor(private readonly service: MasterProductService) {}

  // ── SiteAdmin management ────────────────────────────────────────────────────
  @Get('manage')
  @Public()
  @UseGuards(SiteAdminGuard)
  manageList(@Query() query: MasterProductQueryDto) {
    return this.service.findAllManage(query);
  }

  @Get('manage/:id')
  @Public()
  @UseGuards(SiteAdminGuard)
  manageDetail(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('manage')
  @Public()
  @UseGuards(SiteAdminGuard)
  create(
    @CurrentSiteAdmin('siteadmin_id') siteAdminId: string,
    @Body() dto: CreateMasterProductDto,
  ) {
    return this.service.create(dto, siteAdminId);
  }

  @Post('manage/:id/duplicate')
  @Public()
  @UseGuards(SiteAdminGuard)
  duplicate(
    @CurrentSiteAdmin('siteadmin_id') siteAdminId: string,
    @Param('id') id: string,
  ) {
    return this.service.duplicate(id, siteAdminId);
  }

  @Patch('manage/:id')
  @Public()
  @UseGuards(SiteAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateMasterProductDto) {
    return this.service.update(id, dto);
  }

  @Delete('manage/:id')
  @Public()
  @UseGuards(SiteAdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ── Drug composition (EZHT "Drugs" modal) ────────────────────────────────────
  @Get('manage/:id/drugs')
  @Public()
  @UseGuards(SiteAdminGuard)
  listDrugs(@Param('id') id: string) {
    return this.service.listDrugs(id);
  }

  @Post('manage/:id/drugs')
  @Public()
  @UseGuards(SiteAdminGuard)
  addDrug(@Param('id') id: string, @Body() dto: MasterProductDrugDto) {
    return this.service.addDrug(id, dto);
  }

  @Delete('manage/:id/drugs/:drugId')
  @Public()
  @UseGuards(SiteAdminGuard)
  removeDrug(@Param('id') id: string, @Param('drugId') drugId: string) {
    return this.service.removeDrug(id, drugId);
  }

  // ── Tenant browse + import (business JWT) ────────────────────────────────────
  @Get()
  browse(@Query() query: MasterProductQueryDto) {
    return this.service.browse(query);
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @Body() dto: ImportMasterProductsDto,
  ) {
    return this.service.importToTenant(tenantId, dto.ids);
  }
}
