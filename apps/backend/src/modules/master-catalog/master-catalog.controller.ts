import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';
import { MasterCatalogService } from './master-catalog.service';
import {
  CatalogQueryDto,
  CreateMasterFinanceCategoryDto,
  CreateMasterManufacturerDto,
  CreateMasterProformaDto,
  CreateMasterSupplierDto,
  SaveMasterSettingsDto,
  UpdateMasterFinanceCategoryDto,
  UpdateMasterManufacturerDto,
  UpdateMasterProformaDto,
  UpdateMasterSupplierDto,
} from './master-catalog.dto';

@Controller('master-suppliers')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterSuppliersController {
  constructor(private readonly s: MasterCatalogService) {}
  @Get() list(@Query() q: CatalogQueryDto) { return this.s.listSuppliers(q); }
  @Get('options') options(@Query() q: CatalogQueryDto) { return this.s.supplierOptions(q); }
  @Post() create(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: CreateMasterSupplierDto) { return this.s.createSupplier(dto, by); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateMasterSupplierDto) { return this.s.updateSupplier(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.s.removeSupplier(id); }
}

@Controller('master-manufacturers')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterManufacturersController {
  constructor(private readonly s: MasterCatalogService) {}
  @Get() list(@Query() q: CatalogQueryDto) { return this.s.listManufacturers(q); }
  @Post() create(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: CreateMasterManufacturerDto) { return this.s.createManufacturer(dto, by); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateMasterManufacturerDto) { return this.s.updateManufacturer(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.s.removeManufacturer(id); }
}

@Controller('master-proformas')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterProformasController {
  constructor(private readonly s: MasterCatalogService) {}
  @Get() list(@Query() q: CatalogQueryDto) { return this.s.listProformas(q); }
  @Get(':id') get(@Param('id') id: string) { return this.s.getProforma(id); }
  @Post() create(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: CreateMasterProformaDto) { return this.s.createProforma(dto, by); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateMasterProformaDto) { return this.s.updateProforma(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.s.removeProforma(id); }
}

@Controller('master-settings')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterSettingsController {
  constructor(private readonly s: MasterCatalogService) {}
  @Get() get() { return this.s.getSettings(); }
  @Put() save(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: SaveMasterSettingsDto) { return this.s.saveSettings(dto.data, by); }
}

/** Expense + income categories live under `master-reference/` (same as the other reference lists). */
@Controller('master-reference')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterFinanceCategoriesController {
  constructor(private readonly s: MasterCatalogService) {}

  @Get('expense-categories') listE(@Query() q: CatalogQueryDto) { return this.s.listFinance('expense', q); }
  @Post('expense-categories') createE(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: CreateMasterFinanceCategoryDto) { return this.s.createFinance('expense', dto, by); }
  @Patch('expense-categories/:id') updateE(@Param('id') id: string, @Body() dto: UpdateMasterFinanceCategoryDto) { return this.s.updateFinance('expense', id, dto); }
  @Delete('expense-categories/:id') removeE(@Param('id') id: string) { return this.s.removeFinance('expense', id); }

  @Get('income-categories') listI(@Query() q: CatalogQueryDto) { return this.s.listFinance('income', q); }
  @Post('income-categories') createI(@CurrentSiteAdmin('siteadmin_id') by: string, @Body() dto: CreateMasterFinanceCategoryDto) { return this.s.createFinance('income', dto, by); }
  @Patch('income-categories/:id') updateI(@Param('id') id: string, @Body() dto: UpdateMasterFinanceCategoryDto) { return this.s.updateFinance('income', id, dto); }
  @Delete('income-categories/:id') removeI(@Param('id') id: string) { return this.s.removeFinance('income', id); }
}
