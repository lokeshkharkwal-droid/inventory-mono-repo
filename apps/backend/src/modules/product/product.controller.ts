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
import { ProductService } from './product.service';
import { ProductStockService } from './product-stock.service';
import { ProductBatchService } from './product-batch.service';
import { ProductImportService } from './product-import.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AdjustmentQueryDto,
  AllAdjustmentsQueryDto,
  RecordAdjustmentDto,
  UpdateAdjustmentDto,
} from './dto/stock-adjustment.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { ImportCsvProductsDto } from './dto/import-csv.dto';
import { UpdateImportProductsDto } from './dto/update-import.dto';
import { ProductDrugDto } from './dto/product-drug.dto';
import {
  BulkPriceUpdateDto,
  SetRackDto,
  AddSerialsDto,
} from './dto/product-tools.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

/** Product + stock endpoints (tenant-scoped; stock ops use the active branch). */
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly batchService: ProductBatchService,
    private readonly importService: ProductImportService,
  ) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productService.create(tenantId, dto);
  }

  /** Bulk import (declared before `:id` routes). */
  @Post('import')
  import(@CurrentTenant() tenantId: string, @Body() dto: ImportProductsDto) {
    return this.importService.import(tenantId, dto);
  }

  /** Import products from the EZHT 29-column CSV (declared before `:id`). */
  @Post('import-csv')
  importCsv(
    @CurrentTenant() tenantId: string,
    @Body() dto: ImportCsvProductsDto,
  ) {
    return this.importService.importCsv(tenantId, dto);
  }

  /** Bulk price/cost update (declared before `:id` routes). */
  @Post('bulk-price')
  bulkPrice(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkPriceUpdateDto,
  ) {
    return this.productService.bulkUpdatePrice(tenantId, dto);
  }

  /** Update existing products via CSV rows (declared before `:id` routes). */
  @Post('update-import')
  updateImport(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateImportProductsDto,
  ) {
    return this.importService.updateImport(tenantId, dto);
  }

  /**
   * Adjustment history for the caller's active branch (declared before `:id`).
   * The branch is forced from the JWT — a client-supplied branchId is ignored.
   */
  @Get('adjustments')
  listAllAdjustments(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Query() query: AllAdjustmentsQueryDto,
  ) {
    return this.stockService.listAllAdjustments(tenantId, {
      ...query,
      branchId: profile.branchId ?? undefined,
    });
  }

  /** Product list with inventory values scoped to the caller's active branch. */
  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Query() query: ProductQueryDto,
  ) {
    return this.productService.findAll(tenantId, profile.branchId, query);
  }

  /**
   * Batch-level product search for the Add-Sale autocomplete (EZHT parity):
   * search by product name/code → one row per batch (Name · Batch · Expiry · Qty,
   * negatives preserved) carrying the line defaults. Declared before `:id`. The
   * warehouse defaults to the active branch; a supplied `warehouseId` must be a
   * branch the caller can see (the JWT branch is the safe default). `[]` when no
   * active branch.
   */
  @Get('batch-search')
  searchBatches(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Query('term') term?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('limit') limit?: string,
  ) {
    const branchId = warehouseId || profile.branchId;
    if (!branchId) return [];
    return this.batchService.searchBatches(tenantId, branchId, term, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('inventory:products__delete')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.remove(id, tenantId);
  }

  /** Duplicate a product (scalars + variants + drugs) into a new one. */
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.duplicate(id, tenantId);
  }

  /** List a product's drug-composition rows (EZHT "Drugs" modal). */
  @Get(':id/drugs')
  listDrugs(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.listDrugs(id, tenantId);
  }

  /** Add a drug-composition row to a product. */
  @Post(':id/drugs')
  addDrug(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: ProductDrugDto,
  ) {
    return this.productService.addDrug(id, tenantId, dto);
  }

  /** Delete a single drug-composition row from a product. */
  @Delete(':id/drugs/:drugId')
  removeDrug(
    @Param('id') id: string,
    @Param('drugId') drugId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.productService.removeDrug(id, tenantId, drugId);
  }

  /** On-hand stock across branches for a product. */
  @Get(':id/stock')
  getStock(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.stockService.getStock(id, tenantId);
  }

  /** Per-variant on-hand stock across branches for a product. */
  @Get(':id/variant-stock')
  getVariantStock(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.stockService.getVariantStock(id, tenantId);
  }

  /**
   * Batches of this product available at the caller's active branch, earliest-expiry
   * first — the source for the sale-form batch picker and the Product Details batch
   * panel. Default: in-stock, non-expired. `?all=1` includes expired + non-zero
   * (negative) rows for the detail page. Returns `[]` when there's no active branch.
   */
  @Get(':id/batches')
  async getBatches(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Query('all') all?: string,
  ) {
    await this.productService.findById(id, tenantId); // 404 if not in tenant
    if (!profile.branchId) return [];
    const includeAll = all === '1' || all === 'true';
    return this.batchService.availableForProduct(
      tenantId,
      profile.branchId,
      id,
      { includeExpired: includeAll, includeEmpty: includeAll },
    );
  }

  /**
   * Fully-described batches of this product at the active branch for the Product
   * Details "Batches" panel (EZHT product-view parity: date, code/name, variant,
   * serial, expiry, pack size/cost, cost, pack MRP/MRP, tax rate, HSN, quantity,
   * warehouse). Includes expired + zero/negative rows. `[]` when no active branch.
   */
  @Get(':id/batch-details')
  async getBatchDetails(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ) {
    await this.productService.findById(id, tenantId); // 404 if not in tenant
    if (!profile.branchId) return [];
    return this.batchService.detailForProduct(tenantId, profile.branchId, id, {
      includeExpired: true,
      includeEmpty: true,
    });
  }

  /** Record a stock adjustment at the caller's active branch. */
  @Post(':id/adjustments')
  @RequirePermission('inventory:products__adjust_stock')
  recordAdjustment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: RecordAdjustmentDto,
  ) {
    return this.stockService.recordAdjustment(
      tenantId,
      profile.branchId,
      id,
      dto,
      personId,
    );
  }

  /** Adjustment history for a product. */
  @Get(':id/adjustments')
  listAdjustments(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Query() query: AdjustmentQueryDto,
  ) {
    return this.stockService.listAdjustments(id, tenantId, query);
  }

  /** Update an adjustment's descriptive fields. */
  @Patch(':id/adjustments/:adjId')
  updateAdjustment(
    @Param('id') id: string,
    @Param('adjId') adjId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateAdjustmentDto,
  ) {
    return this.stockService.updateAdjustment(id, tenantId, adjId, dto);
  }

  /** Delete an adjustment and reverse its stock effect. */
  @Delete(':id/adjustments/:adjId')
  @RequirePermission('inventory:products__adjust_stock')
  deleteAdjustment(
    @Param('id') id: string,
    @Param('adjId') adjId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.stockService.deleteAdjustment(id, tenantId, adjId);
  }

  /** Set the product's rack/bin at the active branch. */
  @Post(':id/rack')
  setRack(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: SetRackDto,
  ) {
    return this.productService.setRack(
      id,
      tenantId,
      profile.branchId,
      dto.rack,
    );
  }

  /** List a product's serial units. */
  @Get(':id/serials')
  serials(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.listSerials(id, tenantId);
  }

  /** Register serial numbers for a serialized product. */
  @Post(':id/serials')
  addSerials(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: AddSerialsDto,
  ) {
    return this.productService.addSerials(
      id,
      tenantId,
      profile.branchId,
      dto.serials,
    );
  }
}
