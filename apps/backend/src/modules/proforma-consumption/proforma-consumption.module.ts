import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { ProformaConsumptionController } from './proforma-consumption.controller';
import { ProformaConsumptionService } from './proforma-consumption.service';

/**
 * Proforma consumption module — resolves proforma ↔ lab-test/branch mappings into
 * inventory deductions + linked sales for confirmed kalnostics-new orders. Imports
 * ProductModule for the shared {@link ProductStockService} stock engine.
 */
@Module({
  imports: [PrismaModule, ProductModule],
  controllers: [ProformaConsumptionController],
  providers: [ProformaConsumptionService],
  exports: [ProformaConsumptionService],
})
export class ProformaConsumptionModule {}
