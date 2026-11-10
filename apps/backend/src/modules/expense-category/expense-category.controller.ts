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
import { ExpenseCategoryService } from './expense-category.service';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  ExpenseCategoryQueryDto,
} from './dto/expense-category.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Expense category endpoints (tenant-scoped via the JWT). */
@Controller('expense-categories')
export class ExpenseCategoryController {
  constructor(private readonly service: ExpenseCategoryService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ExpenseCategoryQueryDto,
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
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
