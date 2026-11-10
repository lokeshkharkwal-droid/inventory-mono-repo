import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { SupplierModule } from '../supplier/supplier.module';
import { ProductModule } from '../product/product.module';
import { SaleModule } from '../sale/sale.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

/**
 * Quotes module. Imports Customer/Supplier/Product for reference validation and
 * SaleModule so a sales quote can be converted into a sale (rule #3).
 */
@Module({
  imports: [
    PrismaModule,
    CustomerModule,
    SupplierModule,
    ProductModule,
    SaleModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
