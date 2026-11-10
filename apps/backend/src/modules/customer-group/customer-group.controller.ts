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
import { CustomerGroupService } from './customer-group.service';
import {
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
  CustomerGroupQueryDto,
} from './dto/customer-group.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Customer group endpoints (tenant-scoped via the JWT). */
@Controller('customer-groups')
export class CustomerGroupController {
  constructor(private readonly customerGroupService: CustomerGroupService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCustomerGroupDto,
  ) {
    return this.customerGroupService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: CustomerGroupQueryDto,
  ) {
    return this.customerGroupService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.customerGroupService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.customerGroupService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.customerGroupService.remove(id, tenantId);
  }
}
