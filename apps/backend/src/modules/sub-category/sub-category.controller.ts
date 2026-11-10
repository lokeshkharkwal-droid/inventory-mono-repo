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
import { SubCategoryService } from './sub-category.service';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
  SubCategoryQueryDto,
} from './dto/sub-category.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Sub-category endpoints (tenant-scoped via the JWT). */
@Controller('sub-categories')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSubCategoryDto) {
    return this.subCategoryService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: SubCategoryQueryDto,
  ) {
    return this.subCategoryService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.subCategoryService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.subCategoryService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.subCategoryService.remove(id, tenantId);
  }
}
