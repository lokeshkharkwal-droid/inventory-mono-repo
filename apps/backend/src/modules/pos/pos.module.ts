import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SaleModule } from '../sale/sale.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

/**
 * POS module. Reuses SaleService (checkout = sale + payments + stock),
 * ProductService (lookup), and SettingsService (cashier PIN), per rule #3.
 */
@Module({
  imports: [PrismaModule, SaleModule, ProductModule, SettingsModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
