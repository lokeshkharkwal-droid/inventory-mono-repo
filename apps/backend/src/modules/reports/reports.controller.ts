import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsStockService } from './reports-stock.service';
import { ReportsSalesService } from './reports-sales.service';
import { ReportsIpdService } from './reports-ipd.service';
import { ReportsPurchasesService } from './reports-purchases.service';
import { ReportsFinanceService } from './reports-finance.service';
import { ReportsPartiesService } from './reports-parties.service';
import {
  ExpiryQueryDto,
  PartyLedgerQueryDto,
  ReportQueryDto,
  ReportRangeDto,
} from './dto/reports-query.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Read-only reporting endpoints (tenant-scoped via the JWT). */
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly stock: ReportsStockService,
    private readonly sales: ReportsSalesService,
    private readonly ipd: ReportsIpdService,
    private readonly purchases: ReportsPurchasesService,
    private readonly finance: ReportsFinanceService,
    private readonly parties: ReportsPartiesService,
  ) {}

  // ── Sales reports ───────────────────────────────────────────────────────────

  @Get('daily-sales')
  dailySales(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.dailySales(t, q);
  }

  @Get('monthly-sales')
  monthlySales(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.monthlySales(t, q);
  }

  @Get('sales')
  salesReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.sales(t, q);
  }

  @Get('sales-tax')
  salesTaxReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.salesTax(t, q);
  }

  @Get('sales-quantity')
  salesQuantity(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.salesQuantity(t, q);
  }

  @Get('payments-ledger')
  paymentsLedger(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.payments(t, q);
  }

  @Get('gst-invoices')
  gstInvoices(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.gst(t, q);
  }

  @Get('profit-loss-report')
  profitLossReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.profitLoss(t, q);
  }

  @Get('profit-loss-sales')
  profitLossSales(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.sales.profitLossSales(t, q);
  }

  // ── IPD reports ───────────────────────────────────────────────────────────

  @Get('ipd-sales')
  ipdSales(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.ipd.ipdSales(t, q);
  }

  @Get('ipd-department-sales')
  ipdDepartmentSales(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.ipd.ipdDepartmentSales(t, q);
  }

  // ── Purchase reports ────────────────────────────────────────────────────────

  @Get('daily-purchases')
  dailyPurchases(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.purchases.dailyPurchases(t, q);
  }

  @Get('monthly-purchases')
  monthlyPurchases(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.purchases.monthlyPurchases(t, q);
  }

  @Get('purchases')
  purchasesReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.purchases.purchases(t, q);
  }

  @Get('purchase-age')
  purchaseAge(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.purchases.purchaseAge(t, q);
  }

  @Get('purchases-tax')
  purchasesTax(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.purchases.purchasesTax(t, q);
  }

  // ── Financial reports ───────────────────────────────────────────────────────

  @Get('transfers')
  transfersReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.finance.transfers(t, q);
  }

  @Get('expenses')
  expensesReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.finance.expenses(t, q);
  }

  @Get('incomes')
  incomesReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.finance.incomes(t, q);
  }

  @Get('income-expense')
  incomeExpense(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.finance.incomeExpense(t, q);
  }

  // ── Party reports ───────────────────────────────────────────────────────────

  @Get('customers')
  customersReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.parties.customers(t, q);
  }

  @Get('patients')
  patientsReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.parties.patients(t, q);
  }

  @Get('suppliers')
  suppliersReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.parties.suppliers(t, q);
  }

  @Get('supplier-credit')
  supplierCredit(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.parties.supplierCredit(t, q);
  }

  @Get('staff')
  staffReport(@CurrentTenant() t: string, @Query() q: ReportQueryDto) {
    return this.parties.users(t, q);
  }

  // ── Stock / inventory reports (migrated EZHealthTrack) ──────────────────────

  @Get('warehouse-stock')
  warehouseStock(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.warehouseStock(tenantId, q.warehouseId);
  }

  @Get('materials')
  materials(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.materials(tenantId, q);
  }

  @Get('tools-and-plants')
  toolsAndPlants(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.toolsAndPlants(tenantId, q);
  }

  @Get('register')
  register(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.register(tenantId, q);
  }

  @Get('quantity-alerts')
  quantityAlerts(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.quantityAlerts(tenantId, q.warehouseId, q.search);
  }

  @Get('expiry-alerts')
  expiryAlerts(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.expiryAlerts(tenantId, q);
  }

  @Get('products')
  productsReport(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.products(tenantId, q);
  }

  @Get('categories')
  categoriesReport(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.categories(tenantId, q);
  }

  @Get('exposures')
  exposures(@CurrentTenant() tenantId: string, @Query() q: ReportQueryDto) {
    return this.stock.exposures(tenantId, q);
  }

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
