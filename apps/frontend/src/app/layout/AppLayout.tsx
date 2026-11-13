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
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}
interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * Sidebar navigation grouped into logical, collapsible sections. Routes, labels
 * and icons are unchanged from the flat list — only organised for a compact,
 * scannable sidebar.
 */
const GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/pos', label: 'POS', icon: Monitor },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'Catalog',
    icon: Boxes,
    items: [
      { to: '/products', label: 'Products', icon: Boxes },
      { to: '/products/quantity-adjustments', label: 'Quantity Adjustments', icon: ClipboardList },
      { to: '/products/print-barcodes', label: 'Print Barcodes', icon: Barcode },
      { to: '/products/import', label: 'Import Products', icon: Upload },
      { to: '/products/update-csv', label: 'Update via CSV', icon: FileSpreadsheet },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/sub-categories', label: 'Sub-categories', icon: FolderTree },
      { to: '/units', label: 'Units', icon: Ruler },
      { to: '/brands', label: 'Brands', icon: Factory },
      { to: '/manufacturers', label: 'Manufacturers', icon: Factory },
      { to: '/product-templates', label: 'Product templates', icon: FileSpreadsheet },
      { to: '/master-data', label: 'Master Data', icon: Package },
      { to: '/tax-rates', label: 'Tax rates', icon: Percent },
      { to: '/variants', label: 'Variants', icon: Shapes },
    ],
  },
  {
    title: 'Purchasing',
    icon: ShoppingCart,
    items: [
      { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { to: '/purchase-returns', label: 'Purchase returns', icon: Undo2 },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    title: 'Sales',
    icon: Receipt,
    items: [
      { to: '/sales', label: 'Sales', icon: Receipt },
      { to: '/sale-returns', label: 'Sale returns', icon: RotateCcw },
      { to: '/deliveries', label: 'Deliveries', icon: PackageCheck },
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/patients', label: 'Patients', icon: HeartPulse },
      { to: '/quotes', label: 'Quotes', icon: FileSignature },
      { to: '/proformas', label: 'Proformas', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Operations',
    icon: ArrowLeftRight,
    items: [
      { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
      { to: '/requisitions', label: 'Requisitions', icon: ClipboardList },
      { to: '/materials', label: 'Materials', icon: Wrench },
    ],
  },
  {
    title: 'Clinical',
    icon: HeartPulse,
    items: [
      { to: '/blood-donors', label: 'Blood donors', icon: Droplet },
      { to: '/blood-donations', label: 'Blood donations', icon: HeartPulse },
      { to: '/blood-requests', label: 'Blood requests', icon: Droplet },
      { to: '/ipd', label: 'IPD admissions', icon: BedDouble },
    ],
  },
  {
    title: 'Finance',
    icon: Coins,
    items: [
      { to: '/expenses', label: 'Expenses', icon: TrendingDown },
      { to: '/incomes', label: 'Incomes', icon: TrendingUp },
      { to: '/gift-cards', label: 'Gift cards', icon: CreditCard },
      { to: '/expense-categories', label: 'Expense categories', icon: TrendingDown },
      { to: '/income-categories', label: 'Income categories', icon: TrendingUp },
      { to: '/billers', label: 'Billers', icon: FileText },
      { to: '/currencies', label: 'Currencies', icon: Coins },
      { to: '/customer-groups', label: 'Customer groups', icon: UsersRound },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
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
    title: 'System',
    icon: Settings,
    items: [
      { to: '/permissions', label: 'Permissions', icon: ShieldCheck },
      { to: '/roles', label: 'Roles', icon: ShieldCheck },
      { to: '/user-roles', label: 'User roles', icon: UsersRound },
      { to: '/email-templates', label: 'Email templates', icon: FileText },
      { to: '/promotions', label: 'Promotions', icon: FileText },
      { to: '/downloads', label: 'Downloads', icon: FileText },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
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
  const activeTitle = activeGroupTitle(pathname);

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
                className="h-full w-auto max-w-full object-contain"
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
          {GROUPS.map((group) => {
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
