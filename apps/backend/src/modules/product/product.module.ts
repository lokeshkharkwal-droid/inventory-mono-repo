import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoryModule } from '../category/category.module';
import { SubCategoryModule } from '../sub-category/sub-category.module';
import { UnitModule } from '../unit/unit.module';
import { BrandModule } from '../brand/brand.module';
import { TaxRateModule } from '../tax-rate/tax-rate.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductStockService } from './product-stock.service';
import { ProductImportService } from './product-import.service';

/**
 * Products feature module. Imports the master-data modules so ProductService can
 * inject their services to validate references (rule #3). Exports ProductService
 * for the transaction modules (purchases/sales/transfers) in Phase 1c.
 */
@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    SubCategoryModule,
    UnitModule,
    BrandModule,
    TaxRateModule,
    AlertsModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductStockService, ProductImportService],
  exports: [ProductService, ProductStockService],
})
export class ProductModule {}
