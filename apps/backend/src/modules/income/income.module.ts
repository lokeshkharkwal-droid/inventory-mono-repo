import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

/** Non-sale incomes feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [IncomeController],
  providers: [IncomeService],
  exports: [IncomeService],
})
export class IncomeModule {}
