import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerGroupController } from './customer-group.controller';
import { CustomerGroupService } from './customer-group.service';

/** Customer group feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [CustomerGroupController],
  providers: [CustomerGroupService],
  exports: [CustomerGroupService],
})
export class CustomerGroupModule {}
