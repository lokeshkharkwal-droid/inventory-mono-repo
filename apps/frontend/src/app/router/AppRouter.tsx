import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { AppLayout } from '@/app/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { CategoriesPage } from '@/pages/categories/CategoriesPage';
import { SubCategoriesPage } from '@/pages/masters/SubCategoriesPage';
import { UnitsPage } from '@/pages/masters/UnitsPage';
import { BrandsPage } from '@/pages/masters/BrandsPage';
import { ManufacturersPage } from '@/pages/masters/ManufacturersPage';
import { TaxRatesPage } from '@/pages/masters/TaxRatesPage';
import { VariantsPage } from '@/pages/masters/VariantsPage';
import { SuppliersPage } from '@/pages/parties/SuppliersPage';
import { CustomersPage } from '@/pages/parties/CustomersPage';
import { PurchasesPage } from '@/pages/purchases/PurchasesPage';
import { SalesPage } from '@/pages/sales/SalesPage';
import { TransfersPage } from '@/pages/transfers/TransfersPage';
import { RequisitionsPage } from '@/pages/requisitions/RequisitionsPage';
import { CurrenciesPage } from '@/pages/settings/CurrenciesPage';
import { CustomerGroupsPage } from '@/pages/settings/CustomerGroupsPage';
import { ExpenseCategoriesPage } from '@/pages/settings/ExpenseCategoriesPage';
import { IncomeCategoriesPage } from '@/pages/settings/IncomeCategoriesPage';
import { BillersPage } from '@/pages/settings/BillersPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { PermissionsPage } from '@/pages/settings/PermissionsPage';
import { RolesPage } from '@/pages/settings/RolesPage';
import { UserRolesPage } from '@/pages/settings/UserRolesPage';
import { EmailTemplatesPage } from '@/pages/settings/EmailTemplatesPage';
import { PromotionsPage } from '@/pages/settings/PromotionsPage';
import { ProductTemplatesPage } from '@/pages/masters/ProductTemplatesPage';
import { QuotesPage } from '@/pages/quotes/QuotesPage';
import { ProformasPage } from '@/pages/proformas/ProformasPage';
import { MaterialsPage } from '@/pages/materials/MaterialsPage';
import { PosPage } from '@/pages/pos/PosPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { BloodDonorsPage } from '@/pages/bloodbank/BloodDonorsPage';
import { BloodDonationsPage } from '@/pages/bloodbank/BloodDonationsPage';
import { BloodRequestsPage } from '@/pages/bloodbank/BloodRequestsPage';
import { IpdAdmissionsPage } from '@/pages/ipd/IpdAdmissionsPage';
import { ExpensesPage } from '@/pages/financials/ExpensesPage';
import { IncomesPage } from '@/pages/financials/IncomesPage';
import { GiftCardsPage } from '@/pages/financials/GiftCardsPage';
import { PurchaseReturnsPage } from '@/pages/returns/PurchaseReturnsPage';
import { SaleReturnsPage } from '@/pages/returns/SaleReturnsPage';
import { DeliveriesPage } from '@/pages/returns/DeliveriesPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { DownloadsPage } from '@/pages/misc/DownloadsPage';

/** Top-level routes: public login vs. the authenticated app shell. */
export function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        {isAuthenticated ? (
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="sub-categories" element={<SubCategoriesPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="manufacturers" element={<ManufacturersPage />} />
            <Route path="product-templates" element={<ProductTemplatesPage />} />
            <Route path="tax-rates" element={<TaxRatesPage />} />
            <Route path="variants" element={<VariantsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="patients" element={<CustomersPage patientsOnly />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="requisitions" element={<RequisitionsPage />} />
            <Route path="currencies" element={<CurrenciesPage />} />
            <Route path="customer-groups" element={<CustomerGroupsPage />} />
            <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
            <Route path="income-categories" element={<IncomeCategoriesPage />} />
            <Route path="billers" element={<BillersPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="proformas" element={<ProformasPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="blood-donors" element={<BloodDonorsPage />} />
            <Route path="blood-donations" element={<BloodDonationsPage />} />
            <Route path="blood-requests" element={<BloodRequestsPage />} />
            <Route path="ipd" element={<IpdAdmissionsPage />} />
            <Route path="purchase-returns" element={<PurchaseReturnsPage />} />
            <Route path="sale-returns" element={<SaleReturnsPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="incomes" element={<IncomesPage />} />
            <Route path="gift-cards" element={<GiftCardsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="user-roles" element={<UserRolesPage />} />
            <Route path="email-templates" element={<EmailTemplatesPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="downloads" element={<DownloadsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
