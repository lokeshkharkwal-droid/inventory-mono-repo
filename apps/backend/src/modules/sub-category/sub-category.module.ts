import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoryModule } from '../category/category.module';
import { SubCategoryController } from './sub-category.controller';
import { SubCategoryService } from './sub-category.service';

/**
 * Sub-category feature module. Imports CategoryModule so SubCategoryService can
 * inject CategoryService to validate the parent category (rule #3).
 */
@Module({
  imports: [PrismaModule, CategoryModule],
  controllers: [SubCategoryController],
  providers: [SubCategoryService],
  exports: [SubCategoryService],
})
export class SubCategoryModule {}
