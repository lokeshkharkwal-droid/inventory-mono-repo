import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { RequisitionController } from './requisition.controller';
import { RequisitionService } from './requisition.service';

/**
 * Requisitions module. Imports ProductModule (product snapshot) + SettingsModule
 * (document numbering).
 */
@Module({
  imports: [PrismaModule, ProductModule, SettingsModule],
  controllers: [RequisitionController],
  providers: [RequisitionService],
  exports: [RequisitionService],
})
export class RequisitionModule {}
