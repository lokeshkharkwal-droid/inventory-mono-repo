import { Module } from '@nestjs/common';
import { SaleModule } from '../sale/sale.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { ProductModule } from '../product/product.module';
import { QuoteModule } from '../quote/quote.module';
import { ProformaModule } from '../proforma/proforma.module';
import { RequisitionModule } from '../requisition/requisition.module';
import { TransferModule } from '../transfer/transfer.module';
import { MaterialModule } from '../material/material.module';
import { IntegrationModule } from '../integration/integration.module';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';
import { BarcodeService } from './barcode.service';

/**
 * Printing module — HTML invoices/receipts/POs/labels + barcode/QR + document
 * prints for quotes/proformas/requisitions/transfers/materials. Reuses each
 * document's service for data (rule #3).
 */
@Module({
  imports: [
    SaleModule,
    PurchaseModule,
    ProductModule,
    QuoteModule,
    ProformaModule,
    RequisitionModule,
    TransferModule,
    MaterialModule,
    IntegrationModule,
  ],
  controllers: [PrintController],
  providers: [PrintService, BarcodeService],
  exports: [PrintService, BarcodeService],
})
export class PrintingModule {}
