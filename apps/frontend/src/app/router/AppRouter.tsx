import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { AppLayout } from '@/app/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { PrintBarcodesPage } from '@/pages/products/PrintBarcodesPage';
import { ImportFromMasterPage } from '@/pages/products/ImportFromMasterPage';
import { ImportCsvPage } from '@/pages/products/ImportCsvPage';
import { UpdateCsvPage } from '@/pages/products/UpdateCsvPage';
import { QuantityAdjustmentsPage } from '@/pages/products/QuantityAdjustmentsPage';
import { CategoriesPage } from '@/pages/categories/CategoriesPage';
import { SubCategoriesPage } from '@/pages/masters/SubCategoriesPage';
import { UnitsPage } from '@/pages/masters/UnitsPage';
import { BrandsPage } from '@/pages/masters/BrandsPage';
import { ManufacturersPage } from '@/pages/masters/ManufacturersPage';
import { ManufacturerFormPage } from '@/pages/masters/ManufacturerFormPage';
import { TaxRatesPage } from '@/pages/masters/TaxRatesPage';
import { VariantsPage } from '@/pages/masters/VariantsPage';
import { DrugsPage } from '@/pages/masters/DrugsPage';
import { SuppliersPage } from '@/pages/parties/SuppliersPage';
import { SupplierFormPage } from '@/pages/parties/SupplierFormPage';
import { CustomersPage } from '@/pages/parties/CustomersPage';
import { PatientsPage } from '@/pages/parties/PatientsPage';
import { CustomerFormPage } from '@/pages/parties/CustomerFormPage';
import { PatientFormPage } from '@/pages/parties/PatientFormPage';
import { PurchasesPage } from '@/pages/purchases/PurchasesPage';
import { PurchaseFormPage } from '@/pages/purchases/PurchaseFormPage';
import { PurchaseDetailPage } from '@/pages/purchases/PurchaseDetailPage';
import { PurchaseReturnFormPage } from '@/pages/purchases/PurchaseReturnFormPage';
import { PurchaseImportPage } from '@/pages/purchases/PurchaseImportPage';
import { SupplierPaymentsPage } from '@/pages/purchases/SupplierPaymentsPage';
import { SalesPage } from '@/pages/sales/SalesPage';
import { SaleFormPage } from '@/pages/sales/SaleFormPage';
import { PosSalesPage } from '@/pages/sales/PosSalesPage';
import { GenerateOrderByCsvPage } from '@/pages/sales/GenerateOrderByCsvPage';
import { TransfersPage } from '@/pages/transfers/TransfersPage';
import { TransferFormPage } from '@/pages/transfers/TransferFormPage';
import { ReceivedTransfersPage } from '@/pages/transfers/ReceivedTransfersPage';
import { RequisitionsPage } from '@/pages/requisitions/RequisitionsPage';
import { ReceivedRequisitionsPage } from '@/pages/requisitions/ReceivedRequisitionsPage';
import { RequisitionFormPage } from '@/pages/requisitions/RequisitionFormPage';
import { RequisitionDetailPage } from '@/pages/requisitions/RequisitionDetailPage';
import { TransferDetailPage } from '@/pages/transfers/TransferDetailPage';
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
import { QuoteFormPage } from '@/pages/quotes/QuoteFormPage';
import { QuoteDetailPage } from '@/pages/quotes/QuoteDetailPage';
import { ProformasPage } from '@/pages/proformas/ProformasPage';
import { ProformaFormPage } from '@/pages/proformas/ProformaFormPage';
import { MaterialsPage } from '@/pages/materials/MaterialsPage';
import { MaterialFormPage } from '@/pages/materials/MaterialFormPage';
import { MaterialRepairsPage } from '@/pages/materials/MaterialRepairsPage';
import { MaterialDamagesPage } from '@/pages/materials/MaterialDamagesPage';
import { PosPage } from '@/pages/pos/PosPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { WarehouseStockPage } from '@/pages/reports/WarehouseStockPage';
import { MaterialsPage as MaterialsReportPage } from '@/pages/reports/MaterialsPage';
import { ToolsAndPlantsPage } from '@/pages/reports/ToolsAndPlantsPage';
import { MaterialAndPlantsPage } from '@/pages/reports/MaterialAndPlantsPage';
import { ProductQuantityPage } from '@/pages/reports/ProductQuantityPage';
import { ProductQuantityBatchPage } from '@/pages/reports/ProductQuantityBatchPage';
import { LocalPurchasesPage } from '@/pages/reports/LocalPurchasesPage';
import { TotalLocalPurchasesPage } from '@/pages/reports/TotalLocalPurchasesPage';
import { RegisterReportPage } from '@/pages/reports/RegisterReportPage';
import { QuantityAlertsPage } from '@/pages/reports/QuantityAlertsPage';
import { ExpiryAlertsPage } from '@/pages/reports/ExpiryAlertsPage';
import { ProductsReportPage } from '@/pages/reports/ProductsReportPage';
import { CategoriesReportPage } from '@/pages/reports/CategoriesReportPage';
import { ExposuresPage } from '@/pages/reports/ExposuresPage';
import { DailySalesPage } from '@/pages/reports/DailySalesPage';
import { MonthlySalesPage } from '@/pages/reports/MonthlySalesPage';
import { SalesReportPage } from '@/pages/reports/SalesReportPage';
import { IpdSalesPage } from '@/pages/reports/IpdSalesPage';
import { IpdDepartmentSalesPage } from '@/pages/reports/IpdDepartmentSalesPage';
import { SalesTaxPage } from '@/pages/reports/SalesTaxPage';
import { GstReportPage } from '@/pages/reports/GstReportPage';
import { SalesQuantityPage } from '@/pages/reports/SalesQuantityPage';
import { PaymentsReportPage } from '@/pages/reports/PaymentsReportPage';
import { ProfitLossPage } from '@/pages/reports/ProfitLossPage';
import { ProfitLossSalesPage } from '@/pages/reports/ProfitLossSalesPage';
import { DailyPurchasesPage } from '@/pages/reports/DailyPurchasesPage';
import { MonthlyPurchasesPage } from '@/pages/reports/MonthlyPurchasesPage';
import { PurchasesReportPage } from '@/pages/reports/PurchasesReportPage';
import { PurchaseAgePage } from '@/pages/reports/PurchaseAgePage';
import { PurchasesTaxPage } from '@/pages/reports/PurchasesTaxPage';
import { TransfersReportPage } from '@/pages/reports/TransfersReportPage';
import { ExpensesReportPage } from '@/pages/reports/ExpensesReportPage';
import { IncomesReportPage } from '@/pages/reports/IncomesReportPage';
import { IncomeExpensePage } from '@/pages/reports/IncomeExpensePage';
import { CustomersReportPage } from '@/pages/reports/CustomersReportPage';
import { PatientsReportPage } from '@/pages/reports/PatientsReportPage';
import { SuppliersReportPage } from '@/pages/reports/SuppliersReportPage';
import { SupplierCreditPage } from '@/pages/reports/SupplierCreditPage';
import { StaffReportPage } from '@/pages/reports/StaffReportPage';
import { BloodDonorsPage } from '@/pages/bloodbank/BloodDonorsPage';
import { BloodDonationsPage } from '@/pages/bloodbank/BloodDonationsPage';
import { BloodRequestsPage } from '@/pages/bloodbank/BloodRequestsPage';
import { IpdAdmissionsPage } from '@/pages/ipd/IpdAdmissionsPage';
import { ExpensesPage } from '@/pages/financials/ExpensesPage';
import { ExpenseFormPage } from '@/pages/financials/ExpenseFormPage';
import { IncomesPage } from '@/pages/financials/IncomesPage';
import { IncomeFormPage } from '@/pages/financials/IncomeFormPage';
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
            <Route path="products/add" element={<ProductFormPage />} />
            <Route path="products/edit/:id" element={<ProductFormPage />} />
            <Route path="products/view/:id" element={<ProductDetailPage />} />
            <Route path="products/print-barcodes" element={<PrintBarcodesPage />} />
            <Route path="products/import-products" element={<ImportFromMasterPage />} />
            <Route path="products/import-csv" element={<ImportCsvPage />} />
            {/* Legacy path kept as a redirect to the renamed CSV-import route. */}
            <Route path="products/import" element={<Navigate to="/products/import-csv" replace />} />
            <Route path="products/update-csv" element={<UpdateCsvPage />} />
            <Route path="products/quantity-adjustments" element={<QuantityAdjustmentsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="sub-categories" element={<SubCategoriesPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="manufacturers" element={<ManufacturersPage />} />
            <Route path="manufacturers/add" element={<ManufacturerFormPage />} />
            <Route path="manufacturers/edit/:id" element={<ManufacturerFormPage />} />
            <Route path="product-templates" element={<ProductTemplatesPage />} />
            {/* Master Data is now the Product accordion's "Import Products" page. */}
            <Route path="master-data" element={<Navigate to="/products/import-products" replace />} />
            <Route path="tax-rates" element={<TaxRatesPage />} />
            <Route path="variants" element={<VariantsPage />} />
            <Route path="drugs" element={<DrugsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/add" element={<SupplierFormPage />} />
            <Route path="suppliers/edit/:id" element={<SupplierFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/add" element={<CustomerFormPage />} />
            <Route path="customers/edit/:id" element={<CustomerFormPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/add" element={<PatientFormPage />} />
            <Route path="patients/edit/:id" element={<PatientFormPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/add" element={<PurchaseFormPage />} />
            <Route path="purchases/edit/:id" element={<PurchaseFormPage />} />
            <Route path="purchases/view/:id" element={<PurchaseDetailPage />} />
            <Route
              path="purchases/return/:purchaseId"
              element={<PurchaseReturnFormPage />}
            />
            <Route path="purchases/returns" element={<PurchaseReturnsPage />} />
            <Route path="purchases/import" element={<PurchaseImportPage />} />
            <Route
              path="purchases/supplier-payments"
              element={<SupplierPaymentsPage />}
            />
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/add" element={<SaleFormPage />} />
            <Route path="sales/edit/:id" element={<SaleFormPage />} />
            <Route
              path="sales/generate-order-by-csv"
              element={<GenerateOrderByCsvPage />}
            />
            <Route path="pos/sales" element={<PosSalesPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="transfers/add" element={<TransferFormPage />} />
            <Route path="transfers/edit/:id" element={<TransferFormPage />} />
            <Route path="transfers/view/:id" element={<TransferDetailPage />} />
            <Route path="transfers/received" element={<ReceivedTransfersPage />} />
            <Route path="requisitions" element={<RequisitionsPage />} />
            <Route path="requisitions/add" element={<RequisitionFormPage />} />
            <Route
              path="requisitions/edit/:id"
              element={<RequisitionFormPage />}
            />
            <Route
              path="requisitions/view/:id"
              element={<RequisitionDetailPage />}
            />
            <Route
              path="requisitions/received"
              element={<ReceivedRequisitionsPage />}
            />
            <Route path="currencies" element={<CurrenciesPage />} />
            <Route path="customer-groups" element={<CustomerGroupsPage />} />
            <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
            <Route path="income-categories" element={<IncomeCategoriesPage />} />
            <Route path="billers" element={<BillersPage />} />
            <Route path="quotes" element={<QuotesPage type="SALE" />} />
            <Route path="quotes/add" element={<QuoteFormPage type="SALE" />} />
            <Route path="quotes/sales/add" element={<QuoteFormPage type="SALE" />} />
            <Route path="quotes/view/:id" element={<QuoteDetailPage />} />
            <Route path="quotes/edit/:id" element={<QuoteFormPage type="SALE" />} />
            <Route path="quotes/purchases" element={<QuotesPage type="PURCHASE" />} />
            <Route
              path="quotes/purchases/add"
              element={<QuoteFormPage type="PURCHASE" />}
            />
            <Route
              path="quotes/purchases/edit/:id"
              element={<QuoteFormPage type="PURCHASE" />}
            />
            <Route path="proformas" element={<ProformasPage />} />
            <Route path="proformas/add" element={<ProformaFormPage />} />
            <Route path="proformas/:id/edit" element={<ProformaFormPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="materials/add" element={<MaterialFormPage />} />
            <Route path="materials/edit/:id" element={<MaterialFormPage />} />
            <Route path="materials/repairs" element={<MaterialRepairsPage />} />
            <Route path="materials/damages" element={<MaterialDamagesPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/warehouse-stock" element={<WarehouseStockPage />} />
            <Route path="reports/materials" element={<MaterialsReportPage />} />
            <Route path="reports/tools-and-plants" element={<ToolsAndPlantsPage />} />
            <Route path="reports/material-and-plants" element={<MaterialAndPlantsPage />} />
            <Route path="reports/product-quantity" element={<ProductQuantityPage />} />
            <Route path="reports/product-quantity-batch" element={<ProductQuantityBatchPage />} />
            <Route path="reports/local-purchases" element={<LocalPurchasesPage />} />
            <Route path="reports/total-local-purchases" element={<TotalLocalPurchasesPage />} />
            <Route path="reports/register" element={<RegisterReportPage />} />
            <Route path="reports/quantity-alerts" element={<QuantityAlertsPage />} />
            <Route path="reports/expiry-alerts" element={<ExpiryAlertsPage />} />
            <Route path="reports/products" element={<ProductsReportPage />} />
            <Route path="reports/categories" element={<CategoriesReportPage />} />
            <Route path="reports/exposures" element={<ExposuresPage />} />
            <Route path="reports/daily-sales" element={<DailySalesPage />} />
            <Route path="reports/monthly-sales" element={<MonthlySalesPage />} />
            <Route path="reports/sales" element={<SalesReportPage />} />
            <Route path="reports/ipd-sales" element={<IpdSalesPage />} />
            <Route path="reports/ipd-department-sales" element={<IpdDepartmentSalesPage />} />
            <Route path="reports/sales-tax" element={<SalesTaxPage />} />
            <Route path="reports/gst" element={<GstReportPage />} />
            <Route path="reports/sales-quantity" element={<SalesQuantityPage />} />
            <Route path="reports/payments" element={<PaymentsReportPage />} />
            <Route path="reports/profit-loss" element={<ProfitLossPage />} />
            <Route path="reports/profit-loss-sales" element={<ProfitLossSalesPage />} />
            <Route path="reports/daily-purchases" element={<DailyPurchasesPage />} />
            <Route path="reports/monthly-purchases" element={<MonthlyPurchasesPage />} />
            <Route path="reports/purchases" element={<PurchasesReportPage />} />
            <Route path="reports/purchase-age" element={<PurchaseAgePage />} />
            <Route path="reports/purchases-tax" element={<PurchasesTaxPage />} />
            <Route path="reports/transfers" element={<TransfersReportPage />} />
            <Route path="reports/expenses" element={<ExpensesReportPage />} />
            <Route path="reports/incomes" element={<IncomesReportPage />} />
            <Route path="reports/income-expense" element={<IncomeExpensePage />} />
            <Route path="reports/customers" element={<CustomersReportPage />} />
            <Route path="reports/patients" element={<PatientsReportPage />} />
            <Route path="reports/suppliers" element={<SuppliersReportPage />} />
            <Route path="reports/supplier-credit" element={<SupplierCreditPage />} />
            <Route path="reports/users" element={<StaffReportPage />} />
            <Route path="blood-donors" element={<BloodDonorsPage />} />
            <Route path="blood-donations" element={<BloodDonationsPage />} />
            <Route path="blood-requests" element={<BloodRequestsPage />} />
            <Route path="ipd" element={<IpdAdmissionsPage />} />
            <Route path="purchase-returns" element={<PurchaseReturnsPage />} />
            <Route path="sale-returns" element={<SaleReturnsPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="expenses/add" element={<ExpenseFormPage />} />
            <Route path="expenses/edit/:id" element={<ExpenseFormPage />} />
            <Route path="incomes" element={<IncomesPage />} />
            <Route path="incomes/add" element={<IncomeFormPage />} />
            <Route path="incomes/edit/:id" element={<IncomeFormPage />} />
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
