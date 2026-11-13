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
import { MasterReferenceService } from './master-reference.service';
import {
  MasterReferenceQueryDto,
  CreateMasterCategoryDto,
  UpdateMasterCategoryDto,
  CreateMasterSubCategoryDto,
  UpdateMasterSubCategoryDto,
  CreateMasterNamedDto,
  UpdateMasterNamedDto,
  CreateMasterTaxRateDto,
  UpdateMasterTaxRateDto,
  CreateMasterFinanceCategoryDto,
  UpdateMasterFinanceCategoryDto,
} from './dto/master-reference.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * SiteAdmin-managed canonical reference data for the global catalogue. Every
 * route requires a SiteAdmin token (`@Public()` bypasses the global business
 * guard; {@link SiteAdminGuard} enforces the SiteAdmin token). The master-product
 * form reads these lists to populate its dropdowns.
 */
@Controller('master-reference')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterReferenceController {
  constructor(private readonly service: MasterReferenceService) {}

  // ── Categories ──────────────────────────────────────────────────────────────
  @Get('categories')
  listCategories(@Query() q: MasterReferenceQueryDto) {
    return this.service.listCategories(q);
  }
  @Post('categories')
  createCategory(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterCategoryDto,
  ) {
    return this.service.createCategory(dto, by);
  }
  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMasterCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  // ── Sub-categories ────────────────────────────────────────────────────────────
  @Get('sub-categories')
  listSubCategories(@Query() q: MasterReferenceQueryDto) {
    return this.service.listSubCategories(q);
  }
  @Post('sub-categories')
  createSubCategory(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterSubCategoryDto,
  ) {
    return this.service.createSubCategory(dto, by);
  }
  @Patch('sub-categories/:id')
  updateSubCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMasterSubCategoryDto,
  ) {
    return this.service.updateSubCategory(id, dto);
  }
  @Delete('sub-categories/:id')
  removeSubCategory(@Param('id') id: string) {
    return this.service.removeSubCategory(id);
  }

  // ── Units ──────────────────────────────────────────────────────────────────
  @Get('units')
  listUnits(@Query() q: MasterReferenceQueryDto) {
    return this.service.listUnits(q);
  }
  @Post('units')
  createUnit(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterNamedDto,
  ) {
    return this.service.createUnit(dto, by);
  }
  @Patch('units/:id')
  updateUnit(@Param('id') id: string, @Body() dto: UpdateMasterNamedDto) {
    return this.service.updateUnit(id, dto);
  }
  @Delete('units/:id')
  removeUnit(@Param('id') id: string) {
    return this.service.removeUnit(id);
  }

  // ── Brands ──────────────────────────────────────────────────────────────────
  @Get('brands')
  listBrands(@Query() q: MasterReferenceQueryDto) {
    return this.service.listBrands(q);
  }
  @Post('brands')
  createBrand(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterNamedDto,
  ) {
    return this.service.createBrand(dto, by);
  }
  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateMasterNamedDto) {
    return this.service.updateBrand(id, dto);
  }
  @Delete('brands/:id')
  removeBrand(@Param('id') id: string) {
    return this.service.removeBrand(id);
  }

  // ── Tax rates ────────────────────────────────────────────────────────────────
  @Get('tax-rates')
  listTaxRates(@Query() q: MasterReferenceQueryDto) {
    return this.service.listTaxRates(q);
  }
  @Post('tax-rates')
  createTaxRate(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterTaxRateDto,
  ) {
    return this.service.createTaxRate(dto, by);
  }
  @Patch('tax-rates/:id')
  updateTaxRate(@Param('id') id: string, @Body() dto: UpdateMasterTaxRateDto) {
    return this.service.updateTaxRate(id, dto);
  }
  @Delete('tax-rates/:id')
  removeTaxRate(@Param('id') id: string) {
    return this.service.removeTaxRate(id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────────
  @Get('variants')
  listVariants(@Query() q: MasterReferenceQueryDto) {
    return this.service.listVariants(q);
  }
  @Post('variants')
  createVariant(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterNamedDto,
  ) {
    return this.service.createVariant(dto, by);
  }
  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateMasterNamedDto) {
    return this.service.updateVariant(id, dto);
  }
  @Delete('variants/:id')
  removeVariant(@Param('id') id: string) {
    return this.service.removeVariant(id);
  }

  // ── Expense categories ────────────────────────────────────────────────────────
  @Get('expense-categories')
  listExpenseCategories(@Query() q: MasterReferenceQueryDto) {
    return this.service.listExpenseCategories(q);
  }
  @Post('expense-categories')
  createExpenseCategory(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterFinanceCategoryDto,
  ) {
    return this.service.createExpenseCategory(dto, by);
  }
  @Patch('expense-categories/:id')
  updateExpenseCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMasterFinanceCategoryDto,
  ) {
    return this.service.updateExpenseCategory(id, dto);
  }
  @Delete('expense-categories/:id')
  removeExpenseCategory(@Param('id') id: string) {
    return this.service.removeExpenseCategory(id);
  }

  // ── Income categories ─────────────────────────────────────────────────────────
  @Get('income-categories')
  listIncomeCategories(@Query() q: MasterReferenceQueryDto) {
    return this.service.listIncomeCategories(q);
  }
  @Post('income-categories')
  createIncomeCategory(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterFinanceCategoryDto,
  ) {
    return this.service.createIncomeCategory(dto, by);
  }
  @Patch('income-categories/:id')
  updateIncomeCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMasterFinanceCategoryDto,
  ) {
    return this.service.updateIncomeCategory(id, dto);
  }
  @Delete('income-categories/:id')
  removeIncomeCategory(@Param('id') id: string) {
    return this.service.removeIncomeCategory(id);
  }
}
