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
import { ProductImportService } from './product-import.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AdjustmentQueryDto,
  RecordAdjustmentDto,
} from './dto/stock-adjustment.dto';
import { ImportProductsDto } from './dto/import-products.dto';
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

  /** Bulk price/cost update (declared before `:id` routes). */
  @Post('bulk-price')
  bulkPrice(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkPriceUpdateDto,
  ) {
    return this.productService.bulkUpdatePrice(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: ProductQueryDto) {
    return this.productService.findAll(tenantId, query);
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

  /** On-hand stock across branches for a product. */
  @Get(':id/stock')
  getStock(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.stockService.getStock(id, tenantId);
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
