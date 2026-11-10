import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VariantController } from './variant.controller';
import { VariantService } from './variant.service';

/** Variant/option template feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [VariantController],
  providers: [VariantService],
  exports: [VariantService],
})
export class VariantModule {}
