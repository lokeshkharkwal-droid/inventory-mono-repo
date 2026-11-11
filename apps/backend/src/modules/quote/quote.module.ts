import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { SupplierModule } from '../supplier/supplier.module';
import { ProductModule } from '../product/product.module';
import { SaleModule } from '../sale/sale.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

/**
 * Quotes module. Imports Customer/Supplier/Product for reference validation,
 * SaleModule so a sales quote can convert into a sale and PurchaseModule so a
 * purchase quote can convert into a purchase order (rule #3).
 */
@Module({
  imports: [
    PrismaModule,
    CustomerModule,
    SupplierModule,
    ProductModule,
    SaleModule,
    PurchaseModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
