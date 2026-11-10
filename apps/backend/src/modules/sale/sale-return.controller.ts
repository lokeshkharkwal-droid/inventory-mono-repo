import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SaleReturnService } from './sale-return.service';
import { CreateSaleReturnDto, SaleReturnQueryDto } from './dto/sale-return.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Sale-return endpoints (tenant-scoped; restock inbound). */
@Controller('sale-returns')
export class SaleReturnController {
  constructor(private readonly service: SaleReturnService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateSaleReturnDto,
  ) {
    return this.service.create(tenantId, dto, personId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: SaleReturnQueryDto,
  ) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }
}
