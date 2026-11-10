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
import { SaleService } from './sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { CreateSalePaymentDto, UpdateSalePaymentDto } from './dto/payment.dto';
import { ImportSalesDto } from './dto/import-sales.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Sale endpoints (tenant-scoped; stock removed at the active branch). */
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.saleService.create(tenantId, profile.branchId, dto, personId);
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ImportSalesDto,
  ) {
    return this.saleService.import(tenantId, profile.branchId, dto, personId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: SaleQueryDto) {
    return this.saleService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.saleService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateSaleDto,
  ) {
    return this.saleService.update(id, tenantId, profile.branchId, dto);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateSalePaymentDto,
  ) {
    return this.saleService.addPayment(id, tenantId, dto, personId);
  }

  @Patch(':id/payments/:paymentId')
  editPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateSalePaymentDto,
  ) {
    return this.saleService.editPayment(id, paymentId, tenantId, dto);
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.saleService.deletePayment(id, paymentId, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.saleService.remove(id, tenantId);
  }
}
