import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SaleReturnService } from './sale-return.service';
import { CreateSaleReturnDto, SaleReturnQueryDto } from './dto/sale-return.dto';
import { CreateSalePaymentDto, UpdateSalePaymentDto } from './dto/payment.dto';
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
  findAll(@CurrentTenant() tenantId: string, @Query() query: SaleReturnQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  /** Enriched detail for the Sale-Return detail modal (From/To, items, payments). */
  @Get(':id/detail')
  detail(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.getDetail(id, tenantId);
  }

  /** Payment history for a return (View Payments). */
  @Get(':id/payments')
  payments(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.listPayments(id, tenantId);
  }

  /** Add a payment to a return (blocked when fully settled). */
  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateSalePaymentDto,
  ) {
    return this.service.addPayment(id, tenantId, dto, personId);
  }

  @Patch(':id/payments/:paymentId')
  editPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateSalePaymentDto,
  ) {
    return this.service.editPayment(id, paymentId, tenantId, dto);
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.deletePayment(id, paymentId, tenantId);
  }

  /**
   * Render this return's PDF (mapped `inventory_sale_return` template) and stream
   * it back inline. Library-specific response so the global ResponseInterceptor
   * doesn't wrap the binary.
   */
  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, reference } = await this.service.renderReturnPdf(id, tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="sale-return-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }
}
