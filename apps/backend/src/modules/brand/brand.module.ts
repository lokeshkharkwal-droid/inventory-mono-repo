import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';

/** Brand / manufacturer feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}
