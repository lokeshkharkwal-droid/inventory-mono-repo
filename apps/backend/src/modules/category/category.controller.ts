import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/**
 * Inventory category endpoints. Protected by the global `JwtAuthGuard`; the
 * tenant is resolved from the JWT via `@CurrentTenant()`. Controllers stay thin
 * and return raw data — the global `ResponseInterceptor` builds the envelope.
 */
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /** Create a category. */
  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(tenantId, dto);
  }

  /** List categories (paginated + filterable). */
  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: CategoryQueryDto) {
    return this.categoryService.findAll(tenantId, query);
  }

  /** Get one category by id. */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.categoryService.findById(id, tenantId);
  }

  /** Update a category. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, tenantId, dto);
  }

  /** Soft-delete a category. */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.categoryService.remove(id, tenantId);
  }
}
