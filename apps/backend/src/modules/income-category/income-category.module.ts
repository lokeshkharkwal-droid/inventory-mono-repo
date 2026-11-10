import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IncomeCategoryController } from './income-category.controller';
import { IncomeCategoryService } from './income-category.service';

/** Income category feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [IncomeCategoryController],
  providers: [IncomeCategoryService],
  exports: [IncomeCategoryService],
})
export class IncomeCategoryModule {}
