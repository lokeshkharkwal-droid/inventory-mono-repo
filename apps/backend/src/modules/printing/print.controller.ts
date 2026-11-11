import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PrintService } from './print.service';
import {
  BarcodeSheetDto,
  CombinePrintDto,
  EmailDocumentDto,
} from './dto/print.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/**
 * Printable-document endpoints. Each returns an HTML string (wrapped in the
 * standard envelope); the frontend unwraps `data`, writes it to a new window,
 * and prints — no server-side PDF engine needed.
 */
@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get('sale/:id')
  saleInvoice(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Query('template') template?: string,
  ) {
    return this.printService.saleInvoice(id, tenantId, template);
  }

  @Get('sale/:id/receipt')
  saleReceipt(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.saleReceipt(id, tenantId);
  }

  @Get('purchase/:id')
  purchaseOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.purchaseOrder(id, tenantId);
  }

  @Get('product/:id/label')
  productLabel(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.productLabel(id, tenantId);
  }

  @Post('barcodes')
  barcodeSheet(
    @CurrentTenant() tenantId: string,
    @Body() dto: BarcodeSheetDto,
  ) {
    return this.printService.barcodeSheet(tenantId, dto);
  }

  @Post('combine')
  combine(@CurrentTenant() tenantId: string, @Body() dto: CombinePrintDto) {
    return this.printService.combine(tenantId, dto);
  }

  /**
   * Email a document (invoice/PO/quote/proforma) via the kalnostics comms
   * gateway. Forwards the caller's Bearer token so it sends in their context.
   */
  @Post('email')
  emailDocument(
    @CurrentTenant() tenantId: string,
    @Headers('authorization') authorization: string,
    @Body() dto: EmailDocumentDto,
  ) {
    return this.printService.emailDocument(authorization, tenantId, dto);
  }

  @Get('quote/:id')
  quote(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.quote(id, tenantId);
  }

  @Get('proforma/:id')
  proforma(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.proforma(id, tenantId);
  }

  @Get('requisition/:id')
  requisition(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.requisition(id, tenantId);
  }

  @Get('transfer/:id')
  transfer(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.transfer(id, tenantId);
  }

  @Get('material/:id')
  material(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.printService.material(id, tenantId);
  }
}
