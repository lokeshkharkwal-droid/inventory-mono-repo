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
import { IncomeCategoryService } from './income-category.service';
import {
  CreateIncomeCategoryDto,
  UpdateIncomeCategoryDto,
  IncomeCategoryQueryDto,
} from './dto/income-category.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Income category endpoints (tenant-scoped via the JWT). */
@Controller('income-categories')
export class IncomeCategoryController {
  constructor(private readonly service: IncomeCategoryService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateIncomeCategoryDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: IncomeCategoryQueryDto,
  ) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateIncomeCategoryDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
