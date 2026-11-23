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
import { DrugService } from './drug.service';
import { CreateDrugDto, UpdateDrugDto, DrugQueryDto } from './dto/drug.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

/**
 * Tenant drug-master endpoints (EZHT `pharmacy_drug`). Reads are open to any
 * authenticated business user (the product "Drugs" modal autocomplete reads this);
 * mutations reuse the product management permissions (admin-gated like EZHT).
 */
@Controller('drugs')
export class DrugController {
  constructor(private readonly service: DrugService) {}

  @Post()
  @RequirePermission('inventory:products__create')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateDrugDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: DrugQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Patch(':id')
  @RequirePermission('inventory:products__update')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDrugDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermission('inventory:products__delete')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
