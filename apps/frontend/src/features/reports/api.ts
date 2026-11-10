import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface DashboardSummary {
  productCount: number;
  todaySalesTotal: number;
  todaySalesCount: number;
  stockValue: number;
  lowStockCount: number;
}
export interface RangeSummary {
  count: number;
  gross: number;
  paid: number;
  due: number;
}
export interface ProductSalesRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}
export interface LowStockRow {
  id: string;
  code: string;
  name: string;
  alertQuantity: number;
  totalQuantity: number;
}
export interface ExpiryRow {
  id: string;
  batchNo: string | null;
  expiryDate: string;
  quantity: number;
  product: { name: string; code: string };
}
export interface TaxSummary {
  outputTax: number;
  inputTax: number;
  netPayable: number;
}
export interface ProfitSummary {
  revenue: number;
  cogs: number;
  profit: number;
}
export interface PaymentsSummary {
  received: number;
  made: number;
}

type Range = { from?: string; to?: string };
const q = (r: Range) => ({ from: r.from || undefined, to: r.to || undefined });

export const useDashboard = () =>
  useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => request<DashboardSummary>('GET', '/reports/dashboard'),
  });

export const useSalesSummary = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'sales-summary', r],
    queryFn: () => request<RangeSummary>('GET', '/reports/sales-summary', { query: q(r) }),
  });

export const usePurchaseSummary = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'purchase-summary', r],
    queryFn: () => request<RangeSummary>('GET', '/reports/purchase-summary', { query: q(r) }),
  });

export const useProfit = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'profit', r],
    queryFn: () => request<ProfitSummary>('GET', '/reports/profit', { query: q(r) }),
  });

export const useTaxSummary = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'tax-summary', r],
    queryFn: () => request<TaxSummary>('GET', '/reports/tax-summary', { query: q(r) }),
  });

export const usePaymentsSummary = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'payments', r],
    queryFn: () => request<PaymentsSummary>('GET', '/reports/payments', { query: q(r) }),
  });

export const useProductSales = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'product-sales', r],
    queryFn: () => request<ProductSalesRow[]>('GET', '/reports/product-sales', { query: q(r) }),
  });

export const useLowStock = () =>
  useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: () => request<LowStockRow[]>('GET', '/reports/low-stock'),
  });

export const useExpiry = (days: number) =>
  useQuery({
    queryKey: ['reports', 'expiry', days],
    queryFn: () => request<ExpiryRow[]>('GET', '/reports/expiry', { query: { days } }),
  });

// ── GST / GSTR ────────────────────────────────────────────────────────────────
export interface GstRateRow {
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
}
export interface GstReport {
  rows: GstRateRow[];
  totals: Omit<GstRateRow, 'rate'>;
  from: string;
  to: string;
}
export interface Gstr3bSummary {
  outward: Omit<GstRateRow, 'rate'>;
  inwardItc: Omit<GstRateRow, 'rate'>;
  netPayable: number;
  from: string;
  to: string;
}
export interface ProfitLoss {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  otherIncome: number;
  netProfit: number;
}

export const useGstr1 = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'gstr1', r],
    queryFn: () => request<GstReport>('GET', '/reports/gstr1', { query: q(r) }),
  });

export const useGstr3b = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'gstr3b', r],
    queryFn: () => request<Gstr3bSummary>('GET', '/reports/gstr3b', { query: q(r) }),
  });

export const useProfitLoss = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'profit-loss', r],
    queryFn: () =>
      request<ProfitLoss>('GET', '/reports/profit-loss', { query: q(r) }),
  });

// ── Expanded report suite ───────────────────────────────────────────────────────
export interface DayRow {
  day: string;
  total: number;
  count: number;
}
export interface MonthRow {
  month: string;
  total: number;
  count: number;
}
export interface PartyTotalRow {
  customerId?: string;
  supplierId?: string;
  customerName?: string;
  supplierName?: string;
  orders: number;
  gross: number;
  paid: number;
}
export interface CategoryStockRow {
  name: string;
  quantity: number;
  value: number;
}
export interface UserSalesRow {
  userId: string;
  orders: number;
  gross: number;
}

export const useSalesDaily = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'sales-daily', r],
    queryFn: () =>
      request<DayRow[]>('GET', '/reports/sales-daily', { query: q(r) }),
  });

export const useSalesMonthly = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'sales-monthly', r],
    queryFn: () =>
      request<MonthRow[]>('GET', '/reports/sales-monthly', { query: q(r) }),
  });

export const useTopCustomers = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'top-customers', r],
    queryFn: () =>
      request<PartyTotalRow[]>('GET', '/reports/top-customers', { query: q(r) }),
  });

export const useTopSuppliers = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'top-suppliers', r],
    queryFn: () =>
      request<PartyTotalRow[]>('GET', '/reports/top-suppliers', { query: q(r) }),
  });

export const useStockByCategory = () =>
  useQuery({
    queryKey: ['reports', 'stock-by-category'],
    queryFn: () =>
      request<CategoryStockRow[]>('GET', '/reports/stock-by-category'),
  });

export const useSalesByUser = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'sales-by-user', r],
    queryFn: () =>
      request<UserSalesRow[]>('GET', '/reports/sales-by-user', { query: q(r) }),
  });

export interface BrandSalesRow {
  name: string;
  quantity: number;
  revenue: number;
}
export interface FinancialStatement {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  otherIncome: number;
  netProfit: number;
  paymentsReceived: number;
  paymentsMade: number;
  netTaxPayable: number;
}

export const useSalesByBrand = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'sales-by-brand', r],
    queryFn: () =>
      request<BrandSalesRow[]>('GET', '/reports/sales-by-brand', { query: q(r) }),
  });

export const useFinancialStatement = (r: Range) =>
  useQuery({
    queryKey: ['reports', 'financial-statement', r],
    queryFn: () =>
      request<FinancialStatement>('GET', '/reports/financial-statement', {
        query: q(r),
      }),
  });
