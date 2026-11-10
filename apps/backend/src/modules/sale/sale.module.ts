import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { SaleReturnController } from './sale-return.controller';
import { SaleReturnService } from './sale-return.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

/**
 * Sales module. Imports CustomerModule + ProductModule + SettingsModule to inject
 * their services (customer validation, product snapshot, stock movement, document
 * numbering) per rule #3. Also hosts sale returns and deliveries.
 */
@Module({
  imports: [PrismaModule, CustomerModule, ProductModule, SettingsModule],
  controllers: [SaleController, SaleReturnController, DeliveryController],
  providers: [SaleService, SaleReturnService, DeliveryService],
  exports: [SaleService, SaleReturnService, DeliveryService],
})
export class SaleModule {}
