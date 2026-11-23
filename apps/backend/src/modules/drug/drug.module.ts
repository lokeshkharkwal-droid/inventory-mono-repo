import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DrugController } from './drug.controller';
import { DrugService } from './drug.service';

/** Tenant drug-master feature module (EZHT `pharmacy_drug`). */
@Module({
  imports: [PrismaModule],
  controllers: [DrugController],
  providers: [DrugService],
  exports: [DrugService],
})
export class DrugModule {}
