import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IpdController } from './ipd.controller';
import { IpdService } from './ipd.service';

/** IPD admissions feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [IpdController],
  providers: [IpdService],
  exports: [IpdService],
})
export class IpdModule {}
