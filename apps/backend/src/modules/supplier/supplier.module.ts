import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

/** Supplier feature module. Exports SupplierService for the purchases module. */
@Module({
  imports: [PrismaModule],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
