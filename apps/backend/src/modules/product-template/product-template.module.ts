import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { ProductTemplateController } from './product-template.controller';
import { ProductTemplateService } from './product-template.service';

/** Product templates (SITE master_products) — create real products from blueprints. */
@Module({
  imports: [PrismaModule, ProductModule],
  controllers: [ProductTemplateController],
  providers: [ProductTemplateService],
  exports: [ProductTemplateService],
})
export class ProductTemplateModule {}
