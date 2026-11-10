import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ExpiryQueryDto,
  PartyLedgerQueryDto,
  ReportRangeDto,
} from './dto/reports-query.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Read-only reporting endpoints (tenant-scoped via the JWT). */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard(@CurrentTenant() tenantId: string) {
    return this.reportsService.dashboard(tenantId);
  }

  @Get('sales-summary')
  salesSummary(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.salesSummary(tenantId, q.from, q.to);
  }

  @Get('purchase-summary')
  purchaseSummary(
    @CurrentTenant() tenantId: string,
    @Query() q: ReportRangeDto,
  ) {
    return this.reportsService.purchaseSummary(tenantId, q.from, q.to);
  }

  @Get('product-sales')
  productSales(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.productSales(tenantId, q.from, q.to);
  }

  @Get('inventory-valuation')
  inventoryValuation(@CurrentTenant() tenantId: string) {
    return this.reportsService.inventoryValuation(tenantId);
  }

  @Get('low-stock')
  lowStock(@CurrentTenant() tenantId: string) {
    return this.reportsService.lowStock(tenantId);
  }

  @Get('expiry')
  expiry(@CurrentTenant() tenantId: string, @Query() q: ExpiryQueryDto) {
    return this.reportsService.expiry(tenantId, q.days ?? 30);
  }

  @Get('tax-summary')
  taxSummary(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.taxSummary(tenantId, q.from, q.to);
  }

  @Get('profit')
  profit(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.profit(tenantId, q.from, q.to);
  }

  @Get('payments')
  payments(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.payments(tenantId, q.from, q.to);
  }

  @Get('gstr1')
  gstr1(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.gstr1(tenantId, q.from, q.to);
  }

  @Get('gstr2')
  gstr2(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.gstr2(tenantId, q.from, q.to);
  }

  @Get('gstr3b')
  gstr3b(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.gstr3b(tenantId, q.from, q.to);
  }

  @Get('profit-loss')
  profitLoss(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.profitLoss(tenantId, q.from, q.to);
  }

  @Get('party-ledger')
  partyLedger(
    @CurrentTenant() tenantId: string,
    @Query() q: PartyLedgerQueryDto,
  ) {
    return this.reportsService.partyLedger(
      tenantId,
      q.party,
      q.partyId,
      q.from,
      q.to,
    );
  }

  @Get('sales-daily')
  salesDaily(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.salesDaily(tenantId, q.from, q.to);
  }

  @Get('sales-monthly')
  salesMonthly(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.salesMonthly(tenantId, q.from, q.to);
  }

  @Get('top-customers')
  topCustomers(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.topCustomers(tenantId, q.from, q.to);
  }

  @Get('top-suppliers')
  topSuppliers(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.topSuppliers(tenantId, q.from, q.to);
  }

  @Get('stock-by-category')
  stockByCategory(@CurrentTenant() tenantId: string) {
    return this.reportsService.stockByCategory(tenantId);
  }

  @Get('sales-by-user')
  salesByUser(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.salesByUser(tenantId, q.from, q.to);
  }

  @Get('sales-by-brand')
  salesByBrand(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.salesByBrand(tenantId, q.from, q.to);
  }

  @Get('register-log')
  registerLog(@CurrentTenant() tenantId: string, @Query() q: ReportRangeDto) {
    return this.reportsService.registerLog(tenantId, q.from, q.to);
  }

  @Get('financial-statement')
  financialStatement(
    @CurrentTenant() tenantId: string,
    @Query() q: ReportRangeDto,
  ) {
    return this.reportsService.financialStatement(tenantId, q.from, q.to);
  }
}
