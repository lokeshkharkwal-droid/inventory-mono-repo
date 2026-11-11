import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { configuration, envValidationSchema } from './config';
import { PrismaModule } from './prisma';
import { TenantContextInterceptor } from './common/interceptors';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { IntegrationModule } from './integration/integration.module';
import { RequestTokenInterceptor } from './integration/interceptors/request-token.interceptor';
import { HealthModule } from './modules/health/health.module';
import { CategoryModule } from './modules/category/category.module';
import { SubCategoryModule } from './modules/sub-category/sub-category.module';
import { UnitModule } from './modules/unit/unit.module';
import { BrandModule } from './modules/brand/brand.module';
import { ManufacturerModule } from './modules/manufacturer/manufacturer.module';
import { TaxRateModule } from './modules/tax-rate/tax-rate.module';
import { VariantModule } from './modules/variant/variant.module';
import { ProductModule } from './modules/product/product.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { CustomerModule } from './modules/customer/customer.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { SaleModule } from './modules/sale/sale.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { RequisitionModule } from './modules/requisition/requisition.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { CustomerGroupModule } from './modules/customer-group/customer-group.module';
import { ExpenseCategoryModule } from './modules/expense-category/expense-category.module';
import { IncomeCategoryModule } from './modules/income-category/income-category.module';
import { BillerModule } from './modules/biller/biller.module';
import { SettingsModule } from './modules/settings/settings.module';
import { QuoteModule } from './modules/quote/quote.module';
import { ProformaModule } from './modules/proforma/proforma.module';
import { MaterialModule } from './modules/material/material.module';
import { PosModule } from './modules/pos/pos.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BloodBankModule } from './modules/bloodbank/bloodbank.module';
import { IpdModule } from './modules/ipd/ipd.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { IncomeModule } from './modules/income/income.module';
import { GiftCardModule } from './modules/gift-card/gift-card.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PermissionGuard } from './modules/permissions/permission.guard';
import { PrintingModule } from './modules/printing/printing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { EmailTemplateModule } from './modules/email-template/email-template.module';
import { ProductTemplateModule } from './modules/product-template/product-template.module';
import { MasterProductModule } from './modules/master-product/master-product.module';
import { MasterReferenceModule } from './modules/master-reference/master-reference.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AlertsModule } from './modules/alerts/alerts.module';

/**
 * Root application module. Wires global infrastructure (config, database, auth,
 * kalnostics integration) and registers feature modules. The global business
 * `JwtAuthGuard` protects every route by default (opt out with `@Public()`).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    IntegrationModule,

    // Feature modules.
    HealthModule,
    CategoryModule,
    SubCategoryModule,
    UnitModule,
    BrandModule,
    ManufacturerModule,
    TaxRateModule,
    VariantModule,
    ProductModule,
    SupplierModule,
    CustomerModule,
    PurchaseModule,
    SaleModule,
    TransferModule,
    RequisitionModule,
    CurrencyModule,
    CustomerGroupModule,
    ExpenseCategoryModule,
    IncomeCategoryModule,
    BillerModule,
    SettingsModule,
    QuoteModule,
    ProformaModule,
    MaterialModule,
    PosModule,
    ReportsModule,
    BloodBankModule,
    IpdModule,
    ExpenseModule,
    IncomeModule,
    GiftCardModule,
    PermissionsModule,
    PrintingModule,
    NotificationModule,
    CalendarModule,
    AlertsModule,
    EmailTemplateModule,
    ProductTemplateModule,
    MasterProductModule,
    MasterReferenceModule,
    PromotionModule,
  ],
  providers: [
    // Global business authentication (opt out with @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Per-permission RBAC — enforces @RequirePermission routes (no-op otherwise).
    // Declared after JwtAuthGuard so req.user is populated.
    { provide: APP_GUARD, useClass: PermissionGuard },
    // Capture the caller's bearer token (AsyncLocalStorage) so the kalnostics
    // integration clients can forward it. Runs after the guard.
    { provide: APP_INTERCEPTOR, useClass: RequestTokenInterceptor },
    // Establish the per-request tenant context (AsyncLocalStorage) from the JWT
    // so the Prisma RLS extension can scope queries.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
