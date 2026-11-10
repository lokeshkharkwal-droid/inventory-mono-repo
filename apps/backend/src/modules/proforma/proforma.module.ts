import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { ProductModule } from '../product/product.module';
import { ProformaController } from './proforma.controller';
import { ProformaService } from './proforma.service';

/** Proformas module. Imports Customer + Product for reference validation. */
@Module({
  imports: [PrismaModule, CustomerModule, ProductModule],
  controllers: [ProformaController],
  providers: [ProformaService],
  exports: [ProformaService],
})
export class ProformaModule {}
