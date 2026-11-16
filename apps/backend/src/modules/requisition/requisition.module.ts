import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { TransferModule } from '../transfer/transfer.module';
import { RequisitionController } from './requisition.controller';
import { RequisitionService } from './requisition.service';

/**
 * Requisitions module. Imports ProductModule (product snapshot), SettingsModule
 * (document numbering) and TransferModule (convert-to-transfer fulfilment).
 * KalnosticsBranchClient/KalnosticsDepartmentClient come from the global
 * IntegrationModule.
 */
@Module({
  imports: [PrismaModule, ProductModule, SettingsModule, TransferModule],
  controllers: [RequisitionController],
  providers: [RequisitionService],
  exports: [RequisitionService],
})
export class RequisitionModule {}
