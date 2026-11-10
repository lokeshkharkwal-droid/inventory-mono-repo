import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

/**
 * Inventory category feature module. Exports `CategoryService` so other modules
 * (e.g. products) can inject it.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
