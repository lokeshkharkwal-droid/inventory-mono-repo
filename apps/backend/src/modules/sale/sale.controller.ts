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
    return this.saleService.getDetail(id, tenantId);
  }

  /**
   * Render this sale's "Template Invoice" as a PDF (via the mapped
   * `inventory_invoice` kalnostics print template) and stream it back as
   * `application/pdf`, opened inline in the browser. Uses a library-specific
   * response so the global ResponseInterceptor doesn't wrap the binary.
   */
  @Get(':id/invoice-pdf')
  async invoicePdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, reference } = await this.saleService.renderInvoicePdf(
      id,
      tenantId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="invoice-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
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
