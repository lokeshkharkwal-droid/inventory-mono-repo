import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillerController } from './biller.controller';
import { BillerService } from './biller.service';

/** Biller feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [BillerController],
  providers: [BillerService],
  exports: [BillerService],
})
export class BillerModule {}
