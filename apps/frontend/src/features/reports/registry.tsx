import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BedDouble,
  BookOpen,
  Boxes,
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FolderTree,
  HeartPulse,
  Hourglass,
  Landmark,
  LineChart,
  Package,
  Percent,
  Receipt,
  Scale,
  ShoppingCart,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ReportGroup = 'Inventory' | 'Sales' | 'Purchases' | 'Financial';

/** One migrated report: its route, sidebar/landing label, group and icon. */
export interface ReportMeta {
  /** Stable slug (query-key + route segment). */
  key: string;
  /** Absolute route, e.g. '/reports/warehouse-stock'. */
  path: string;
  /** Sidebar + landing label (matches the legacy EZHealthTrack labels). */
  label: string;
  /** One-line landing-card description. */
  description: string;
  group: ReportGroup;
  icon: LucideIcon;
}

/** The reports overview / landing page (legacy `reports` index "Overview Chart"). */
export const OVERVIEW_REPORT: ReportMeta = {
  key: 'overview',
  path: '/reports',
  label: 'Overview',
  description: 'Sales, purchases & tax trend with quick links to every report.',
  group: 'Inventory',
  icon: BarChart3,
};

/** Ordered groups (matches the legacy sidebar sectioning). */
export const REPORT_GROUPS: ReportGroup[] = [
  'Inventory',
  'Sales',
  'Purchases',
  'Financial',
];

/**
 * Every migrated report, in legacy sidebar order. Single source of truth for the
 * sidebar "Reports" accordion AND the landing quick-links grid.
 */
export const REPORTS: ReportMeta[] = [
  // ── Inventory / stock ──
  { key: 'warehouse-stock', path: '/reports/warehouse-stock', label: 'Warehouse Stock', description: 'Stock valuation by price vs cost, per warehouse.', group: 'Inventory', icon: Building2 },
  { key: 'materials', path: '/reports/materials', label: 'Materials Report', description: 'Materials register with balance quantity & value.', group: 'Inventory', icon: Boxes },
  { key: 'tools-and-plants', path: '/reports/tools-and-plants', label: 'Tools & Plants', description: 'Low-value tools & plants asset register.', group: 'Inventory', icon: Wrench },
  { key: 'register', path: '/reports/register', label: 'Register Report', description: 'POS register open/close cash reconciliation.', group: 'Inventory', icon: BookOpen },
  { key: 'quantity-alerts', path: '/reports/quantity-alerts', label: 'Product Quantity Alerts', description: 'Products at or below their reorder level.', group: 'Inventory', icon: AlertTriangle },
  { key: 'expiry-alerts', path: '/reports/expiry-alerts', label: 'Product Expiry Alerts', description: 'Batches expiring before the alert horizon.', group: 'Inventory', icon: CalendarClock },
  { key: 'products', path: '/reports/products', label: 'Products Report', description: 'Per-product purchased, sold, profit & stock.', group: 'Inventory', icon: Package },
  { key: 'categories', path: '/reports/categories', label: 'Categories Report', description: 'Purchased vs sold & profit per category.', group: 'Inventory', icon: FolderTree },
  { key: 'exposures', path: '/reports/exposures', label: 'Exposure Report', description: 'Per-sale exposure breakdown.', group: 'Inventory', icon: Activity },

  // ── Sales ──
  { key: 'daily-sales', path: '/reports/daily-sales', label: 'Daily Sales', description: 'Day-by-day sales for a month.', group: 'Sales', icon: CalendarDays },
  { key: 'monthly-sales', path: '/reports/monthly-sales', label: 'Monthly Sales', description: 'Month-by-month sales for a year.', group: 'Sales', icon: Calendar },
  { key: 'sales', path: '/reports/sales', label: 'Sales Report', description: 'Every sales invoice with tax, paid & balance.', group: 'Sales', icon: Receipt },
  { key: 'ipd-sales', path: '/reports/ipd-sales', label: 'IPD Sales Report', description: 'Items billed to in-patients (IPD).', group: 'Sales', icon: BedDouble },
  { key: 'ipd-department-sales', path: '/reports/ipd-department-sales', label: 'IPD Department Sales', description: 'IPD consumption grouped by department.', group: 'Sales', icon: Stethoscope },
  { key: 'sales-tax', path: '/reports/sales-tax', label: 'Sales Tax Report', description: 'Per-invoice output tax register.', group: 'Sales', icon: Percent },
  { key: 'gst', path: '/reports/gst', label: 'GST Report', description: 'GSTR-1 / 3B rate-wise GST summary.', group: 'Sales', icon: Landmark },
  { key: 'sales-quantity', path: '/reports/sales-quantity', label: 'Sales Quantity Report', description: 'Quantity sold per product.', group: 'Sales', icon: BarChart3 },
  { key: 'payments', path: '/reports/payments', label: 'Payments Report', description: 'Payments received & made.', group: 'Sales', icon: Wallet },
  { key: 'profit-loss', path: '/reports/profit-loss', label: 'Profit and/or Loss', description: 'Revenue, COGS, expenses & net profit.', group: 'Sales', icon: TrendingUp },
  { key: 'profit-loss-sales', path: '/reports/profit-loss-sales', label: 'Profit and/or Loss on Sales', description: 'Profit per sale / product.', group: 'Sales', icon: LineChart },

  // ── Purchases ──
  { key: 'daily-purchases', path: '/reports/daily-purchases', label: 'Daily Purchases', description: 'Day-by-day purchases for a month.', group: 'Purchases', icon: CalendarDays },
  { key: 'monthly-purchases', path: '/reports/monthly-purchases', label: 'Monthly Purchases', description: 'Month-by-month purchases for a year.', group: 'Purchases', icon: Calendar },
  { key: 'purchases', path: '/reports/purchases', label: 'Purchases Report', description: 'Every purchase order with tax, paid & balance.', group: 'Purchases', icon: ShoppingCart },
  { key: 'purchase-age', path: '/reports/purchase-age', label: 'Purchase Aging Report', description: 'Outstanding purchases by age bucket.', group: 'Purchases', icon: Hourglass },
  { key: 'purchases-tax', path: '/reports/purchases-tax', label: 'Purchases Tax Report', description: 'Per-order input tax register.', group: 'Purchases', icon: Percent },

  // ── Financial / parties ──
  { key: 'transfers', path: '/reports/transfers', label: 'Transfers Report', description: 'Inter-warehouse stock transfers.', group: 'Financial', icon: ArrowLeftRight },
  { key: 'expenses', path: '/reports/expenses', label: 'Expenses Report', description: 'Operating expenses by category.', group: 'Financial', icon: TrendingDown },
  { key: 'incomes', path: '/reports/incomes', label: 'Incomes Report', description: 'Non-sale incomes by category.', group: 'Financial', icon: TrendingUp },
  { key: 'income-expense', path: '/reports/income-expense', label: 'Income Expense Report', description: 'Combined income vs expense statement.', group: 'Financial', icon: Scale },
  { key: 'customers', path: '/reports/customers', label: 'Walk-In Customers Report', description: 'Customers with orders & dues.', group: 'Financial', icon: Users },
  { key: 'patients', path: '/reports/patients', label: 'Patients Report', description: 'Patient customers with orders & dues.', group: 'Financial', icon: HeartPulse },
  { key: 'suppliers', path: '/reports/suppliers', label: 'Suppliers Report', description: 'Suppliers with purchases & balance.', group: 'Financial', icon: Truck },
  { key: 'supplier-credit', path: '/reports/supplier-credit', label: 'Supplier Credit Report', description: 'Supplier outstanding credit balances.', group: 'Financial', icon: CreditCard },
  { key: 'users', path: '/reports/users', label: 'Staff Report', description: 'Sales performance by staff member.', group: 'Financial', icon: UserCog },
];

/** Reports grouped (ordered) for the landing page sections. */
export const REPORTS_BY_GROUP: Record<ReportGroup, ReportMeta[]> =
  REPORT_GROUPS.reduce(
    (acc, g) => {
      acc[g] = REPORTS.filter((r) => r.group === g);
      return acc;
    },
    {} as Record<ReportGroup, ReportMeta[]>,
  );

/** Human group labels for the landing sections. */
export const GROUP_LABELS: Record<ReportGroup, string> = {
  Inventory: 'Inventory & Stock',
  Sales: 'Sales',
  Purchases: 'Purchases',
  Financial: 'Financial & Parties',
};
