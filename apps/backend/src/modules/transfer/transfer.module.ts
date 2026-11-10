import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

/**
 * Transfers module. Imports ProductModule (snapshot + stock movement) and
 * SettingsModule (document numbering). KalnosticsBranchClient comes from the
 * global IntegrationModule.
 */
@Module({
  imports: [PrismaModule, ProductModule, SettingsModule],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
