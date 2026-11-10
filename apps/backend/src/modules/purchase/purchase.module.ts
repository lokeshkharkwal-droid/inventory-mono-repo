import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupplierModule } from '../supplier/supplier.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseReturnController } from './purchase-return.controller';
import { PurchaseReturnService } from './purchase-return.service';

/**
 * Purchases module. Imports SupplierModule + ProductModule + SettingsModule to
 * inject their services (supplier validation, product snapshot, stock movement,
 * document numbering) per rule #3. Also hosts purchase returns.
 */
@Module({
  imports: [PrismaModule, SupplierModule, ProductModule, SettingsModule],
  controllers: [PurchaseController, PurchaseReturnController],
  providers: [PurchaseService, PurchaseReturnService],
  exports: [PurchaseService, PurchaseReturnService],
})
export class PurchaseModule {}
