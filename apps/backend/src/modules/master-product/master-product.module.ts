import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { CategoryModule } from '../category/category.module';
import { SubCategoryModule } from '../sub-category/sub-category.module';
import { UnitModule } from '../unit/unit.module';
import { BrandModule } from '../brand/brand.module';
import { TaxRateModule } from '../tax-rate/tax-rate.module';
import { MasterProductController } from './master-product.controller';
import { MasterProductService } from './master-product.service';

/**
 * Global master-product catalogue (SiteAdmin-maintained). Imports ProductModule
 * so imports reuse ProductService.create, plus the master-data modules so an
 * import can find-or-create the tenant category/sub-category/unit/brand/tax-rate
 * each product is classified under.
 */
@Module({
  imports: [
    PrismaModule,
    ProductModule,
    CategoryModule,
    SubCategoryModule,
    UnitModule,
    BrandModule,
    TaxRateModule,
  ],
  controllers: [MasterProductController],
  providers: [MasterProductService],
  exports: [MasterProductService],
})
export class MasterProductModule {}
