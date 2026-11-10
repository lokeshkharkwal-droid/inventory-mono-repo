import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

/** Materials feature module (+ damages/repairs sub-resources). */
@Module({
  imports: [PrismaModule],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
