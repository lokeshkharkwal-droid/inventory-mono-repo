import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PurchaseReturnService } from './purchase-return.service';
import {
  CreatePurchaseReturnDto,
  PurchaseReturnQueryDto,
} from './dto/purchase-return.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Purchase-return endpoints (tenant-scoped; reverse inbound stock). */
@Controller('purchase-returns')
export class PurchaseReturnController {
  constructor(private readonly service: PurchaseReturnService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreatePurchaseReturnDto,
  ) {
    return this.service.create(tenantId, dto, personId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: PurchaseReturnQueryDto,
  ) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }
}
