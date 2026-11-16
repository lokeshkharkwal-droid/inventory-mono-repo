import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoUrl from '@/assets/logo.png';
import {
  LayoutDashboard,
  Tags,
  FolderTree,
  Ruler,
  Factory,
  Percent,
  Shapes,
  Boxes,
  Truck,
  Users,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  ClipboardList,
  FileSignature,
  FileSpreadsheet,
  Barcode,
  Upload,
  Download,
  Wrench,
  Monitor,
  BarChart3,
  Droplet,
  HeartPulse,
  BedDouble,
  Undo2,
  RotateCcw,
  PackageCheck,
  CreditCard,
  ShieldCheck,
  Coins,
  UsersRound,
  TrendingDown,
  TrendingUp,
  FileText,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Package,
  Plus,
  ChevronDown,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ProfileSwitcher } from '@/components/shared/ProfileSwitcher';
import { OVERVIEW_REPORT, REPORTS } from '@/features/reports/registry';
import { usePermissions, permKey } from '@/features/permissions/api';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Permission key required to see this item (omit = always visible). */
  perm?: string;
}
interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  /** Permission key required to see the whole group (omit = derive from items). */
  perm?: string;
}

// Permission keys (section__action) — mirrors the backend permission catalogue.
const P = {
  productsView: permKey('products', 'view'),
  productsAdjust: permKey('products', 'adjust_stock'),
  partiesView: permKey('parties', 'view'),
  salesView: permKey('sales', 'view'),
  salesDeliver: permKey('sales', 'deliver'),
  salesReturn: permKey('sales', 'return'),
  purchasesView: permKey('purchases', 'view'),
  purchasesPay: permKey('purchases', 'pay'),
  purchasesReturn: permKey('purchases', 'return'),
  requisitionsView: permKey('requisitions', 'view'),
  transfersView: permKey('transfers', 'view'),
  financialsView: permKey('financials', 'view'),
  posUse: permKey('pos', 'use'),
  reportsView: permKey('reports', 'view'),
  settingsView: permKey('settings', 'view'),
  bloodbankView: permKey('bloodbank', 'view'),
  ipdView: permKey('ipd', 'view'),
};

/**
 * Sidebar navigation — mirrors the legacy EZ Health Track inventory sidebar
 * (group structure + order): Dashboard, Product, Proformas, People, Materials,
 * Sales, Quotes, Requisitions, Transfers, Purchases, Expenses, Incomes, Reports,
 * Settings — followed by the monorepo-only Blood Bank / IPD sections (gated).
 *
 * Grouping is the SAME for every role; `perm` keys only control which items a
 * role can see, never the grouping (per the EZHT parity requirement). The list
 * holds existing routes only — separate Add pages (Add Supplier, Add Manufacturer,
 * Add Material, Add Proforma, …) arrive with their routes in a later phase.
 */
const GROUPS: NavGroup[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    // Consolidated Product accordion — mirrors the EZ Health Track sidebar
    // (7 pages, in the same order as the legacy app).
    title: 'Product',
    icon: Boxes,
    perm: P.productsView,
    items: [
      { to: '/products', label: 'Products', icon: Boxes, end: true },
      { to: '/products/add', label: 'Add Product', icon: Plus },
      { to: '/products/print-barcodes', label: 'Print Barcodes', icon: Barcode },
      { to: '/products/import-products', label: 'Import Products', icon: Download },
      { to: '/products/import-csv', label: 'Import Products via CSV', icon: Upload },
      { to: '/products/update-csv', label: 'Update Products via CSV', icon: FileSpreadsheet },
      {
        to: '/products/quantity-adjustments',
        label: 'Quantity Adjustments',
        icon: ClipboardList,
        perm: P.productsAdjust,
      },
    ],
  },
  {
    title: 'Proformas',
    icon: FileSpreadsheet,
    items: [
      { to: '/proformas', label: 'List Proformas', icon: FileSpreadsheet, end: true },
      { to: '/proformas/add', label: 'Add Proforma', icon: Plus },
    ],
  },
  {
    // EZHT "People" — Manufacturers + Suppliers (+ Patients/Customers), each with
    // a dedicated List and Add page.
    title: 'People',
    icon: Users,
    perm: P.partiesView,
    items: [
      { to: '/manufacturers', label: 'List Manufacturers', icon: Factory, end: true },
      { to: '/manufacturers/add', label: 'Add Manufacturer', icon: Plus },
      { to: '/suppliers', label: 'List Suppliers', icon: Truck, end: true },
      { to: '/suppliers/add', label: 'Add Supplier', icon: Plus },
      { to: '/patients', label: 'List Patients', icon: HeartPulse, end: true },
      { to: '/patients/add', label: 'Add Patient', icon: Plus },
      { to: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Materials',
    icon: Wrench,
    items: [
      { to: '/materials', label: 'List Materials', icon: Wrench, end: true },
      { to: '/materials/add', label: 'Add Material', icon: Plus },
      { to: '/materials/repairs', label: 'Repairs', icon: Truck },
      { to: '/materials/damages', label: 'Condemned / Damages', icon: Undo2 },
    ],
  },
  {
    title: 'Sales',
    icon: Receipt,
    perm: P.salesView,
    items: [
      { to: '/sales', label: 'Sales', icon: Receipt, end: true },
      { to: '/pos', label: 'POS', icon: Monitor, perm: P.posUse },
      { to: '/pos/sales', label: 'POS Sales', icon: Monitor, perm: P.posUse },
      { to: '/sales/add', label: 'Add Sales', icon: Plus },
      {
        to: '/sales/generate-order-by-csv',
        label: 'Generate Order by CSV',
        icon: FileSpreadsheet,
      },
      { to: '/deliveries', label: 'Deliveries', icon: PackageCheck, perm: P.salesDeliver },
      { to: '/gift-cards', label: 'Gift Cards', icon: CreditCard },
      { to: '/sale-returns', label: 'Return Sales', icon: RotateCcw, perm: P.salesReturn },
    ],
  },
  {
    title: 'Quotes',
    icon: FileSignature,
    items: [
      { to: '/quotes', label: 'List Quotes Sales', icon: FileSignature, end: true },
      { to: '/quotes/sales/add', label: 'Add Quote Sales', icon: Plus },
      { to: '/quotes/purchases', label: 'List Quotes Purchases', icon: FileSignature },
      { to: '/quotes/purchases/add', label: 'Add Quote Purchase', icon: Plus },
    ],
  },
  {
    title: 'Requisitions',
    icon: ClipboardList,
    perm: P.requisitionsView,
    items: [
      { to: '/requisitions/received', label: 'Received Requisitions', icon: PackageCheck },
      { to: '/requisitions', label: 'Requisition List', icon: ClipboardList, end: true },
      { to: '/requisitions/add', label: 'Add Requisition', icon: Plus },
    ],
  },
  {
    title: 'Transfers',
    icon: ArrowLeftRight,
    perm: P.transfersView,
    items: [
      { to: '/transfers/received', label: 'Received Transfers', icon: PackageCheck },
      { to: '/transfers', label: 'List Transfers', icon: ArrowLeftRight, end: true },
      { to: '/transfers/add', label: 'Add Transfer', icon: Plus },
    ],
  },
  {
    title: 'Purchases',
    icon: ShoppingCart,
    perm: P.purchasesView,
    items: [
      { to: '/purchases', label: 'Purchases', icon: ShoppingCart, end: true },
      { to: '/purchases/add', label: 'Add Purchase', icon: Plus },
      { to: '/purchases/import', label: 'Purchase Import', icon: Upload },
      { to: '/purchase-returns', label: 'Return Purchases', icon: Undo2, perm: P.purchasesReturn },
      {
        to: '/purchases/supplier-payments',
        label: 'Supplier Payments',
        icon: Coins,
        perm: P.purchasesPay,
      },
    ],
  },
  {
    title: 'Expenses',
    icon: TrendingDown,
    perm: P.financialsView,
    items: [
      { to: '/expenses', label: 'List Expenses', icon: TrendingDown, end: true },
      { to: '/expenses/add', label: 'Add Expense', icon: Plus },
    ],
  },
  {
    title: 'Incomes',
    icon: TrendingUp,
    perm: P.financialsView,
    items: [
      { to: '/incomes', label: 'List Incomes', icon: TrendingUp, end: true },
      { to: '/incomes/add', label: 'Add Income', icon: Plus },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    perm: P.reportsView,
    items: [
      {
        to: OVERVIEW_REPORT.path,
        label: OVERVIEW_REPORT.label,
        icon: OVERVIEW_REPORT.icon,
        end: true,
      },
      ...REPORTS.map((r) => ({ to: r.path, label: r.label, icon: r.icon })),
    ],
  },
  {
    // EZHT keeps all masters (Categories, Variants, Tax rates, Currencies,
    // Customer groups, …) under Settings — not a standalone "Catalog" group.
    title: 'Settings',
    icon: Settings,
    perm: P.settingsView,
    items: [
      { to: '/settings', label: 'System Settings', icon: Settings },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/sub-categories', label: 'Sub-categories', icon: FolderTree },
      { to: '/units', label: 'Units', icon: Ruler },
      { to: '/brands', label: 'Brands', icon: Factory },
      { to: '/product-templates', label: 'Product templates', icon: FileSpreadsheet },
      { to: '/variants', label: 'Variants', icon: Shapes },
      { to: '/tax-rates', label: 'Tax rates', icon: Percent },
      { to: '/expense-categories', label: 'Expense categories', icon: TrendingDown },
      { to: '/income-categories', label: 'Income categories', icon: TrendingUp },
      { to: '/currencies', label: 'Currencies', icon: Coins },
      { to: '/customer-groups', label: 'Customer groups', icon: UsersRound },
      { to: '/billers', label: 'Billers', icon: FileText },
      { to: '/permissions', label: 'Permissions', icon: ShieldCheck },
      { to: '/roles', label: 'Roles', icon: ShieldCheck },
      { to: '/user-roles', label: 'User roles', icon: UsersRound },
      { to: '/email-templates', label: 'Email templates', icon: FileText },
      { to: '/promotions', label: 'Promotions', icon: FileText },
      { to: '/downloads', label: 'Downloads', icon: FileText },
    ],
  },
  {
    // Monorepo-only sections — not in EZHT's inventory sidebar; kept behind
    // permissions, after the EZHT groups.
    title: 'Blood Bank',
    icon: HeartPulse,
    perm: P.bloodbankView,
    items: [
      { to: '/blood-donors', label: 'Blood donors', icon: Droplet },
      { to: '/blood-donations', label: 'Blood donations', icon: HeartPulse },
      { to: '/blood-requests', label: 'Blood requests', icon: Droplet },
    ],
  },
  {
    title: 'IPD',
    icon: BedDouble,
    perm: P.ipdView,
    items: [{ to: '/ipd', label: 'IPD admissions', icon: BedDouble }],
  },
];

const STORAGE_KEY = 'inv_sidebar_open_groups';

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function activeGroupTitle(pathname: string): string | undefined {
  return GROUPS.find((g) => g.items.some((i) => isItemActive(i, pathname)))
    ?.title;
}

/** Authenticated app shell: collapsible grouped sidebar + header + content. */
export function AppLayout() {
  const { logout } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { can, isLoading: permsLoading } = usePermissions();
  const activeTitle = activeGroupTitle(pathname);

  // Permission gate: show while perms load (avoids an empty-sidebar flash) and
  // for items/groups without a `perm`. Grouping never changes — only visibility.
  const allow = (perm?: string) => !perm || permsLoading || can(perm);
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((i) => allow(i.perm)),
  })).filter((group) => allow(group.perm) && group.items.length > 0);

  // Which groups are expanded. Persisted; the active group is always opened.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
    } catch {
      /* ignore */
    }
    const initial = new Set(stored.length ? stored : [GROUPS[0]!.title]);
    if (activeTitle) initial.add(activeTitle);
    return initial;
  });

  // Mobile off-canvas drawer.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keep the active group expanded as the route changes.
  useEffect(() => {
    if (!activeTitle) return;
    setOpenGroups((prev) => {
      if (prev.has(activeTitle)) return prev;
      const next = new Set(prev).add(activeTitle);
      return next;
    });
  }, [activeTitle]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col gradient-primary text-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
        )}
      >
        {/* Company logo + branch/role switcher — mirrors the kaltros-fe sidebar head. */}
        <div className="flex flex-col gap-2 border-b border-white/15 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Transparent white-wordmark logo sits directly on the gradient;
                object-contain keeps its aspect ratio. Imported as a bundled
                asset so Vite fingerprints the URL (base-path correct + no stale
                browser cache when the image changes). */}
            <div className="flex h-[60px] flex-1 items-center overflow-hidden">
              <img
                src={logoUrl}
                alt="Kalnostic"
                className="h-[35px] w-auto max-w-full object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ProfileSwitcher />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.title);
            const hasActive = group.title === activeTitle;
            const GroupIcon = group.icon;
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors',
                    hasActive
                      ? 'text-white'
                      : 'text-blue-100 hover:text-white',
                  )}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{t(`nav.${group.title}`)}</span>
                  {hasActive && !isOpen && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mb-1 mt-0.5 space-y-0.5 pl-3">
                    {group.items.map(({ to, label, icon: Icon, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ease-out active:scale-[0.98]',
                            isActive
                              ? 'bg-white/20 text-white shadow-sm'
                              : 'text-blue-100 hover:bg-white/10 hover:text-white',
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-2 border-b border-black bg-black px-4 text-white backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
                <Package className="h-4 w-4" />
              </span>
              Kalnostics · Inventory
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell className="text-white hover:bg-white/10 hover:text-white" />
            {/* Back to Kaltros — /launch lands the user on their default module
                (shared same-origin session), not the login page. */}
            <Button
              variant="outline"
              size="sm"
              asChild
              title="Back to Kaltros"
              className="border-white bg-white text-black hover:bg-white/90 hover:text-black"
            >
              <a href="/launch">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Kaltros</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('app.logout')}</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
