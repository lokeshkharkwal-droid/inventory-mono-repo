import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

/** Customer feature module. Exports CustomerService for the sales module. */
@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
