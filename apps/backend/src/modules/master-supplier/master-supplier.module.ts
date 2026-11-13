import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterSupplierController } from './master-supplier.controller';
import { MasterSupplierService } from './master-supplier.service';

/**
 * SiteAdmin-managed canonical supplier directory for the global master-product
 * catalogue. Platform-level.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MasterSupplierController],
  providers: [MasterSupplierService],
  exports: [MasterSupplierService],
})
export class MasterSupplierModule {}
