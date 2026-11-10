import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

/** Units of measure feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService],
})
export class UnitModule {}
