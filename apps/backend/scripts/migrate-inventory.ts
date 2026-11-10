/**
 * Legacy inventory data migration: MySQL (ezhealthtrackv2_*) → shared Postgres
 * (inventory_* tables). Modelled on kalnostics-new/scripts/migrate-ezhealthtrack.ts.
 *
 * Principles (Master plan §8):
 *  - Call real Nest services via an application context (not raw inserts), so
 *    business rules + RLS context apply.
 *  - Idempotent: look up by `legacy*` id first; skip if already migrated.
 *  - One legacy per-tenant DB → one kalnostics tenant. Provide the target tenant
 *    (and a default branch for opening stock) via env.
 *
 * Covered: master data (categories, sub-categories, units, brands, tax rates),
 * parties (suppliers, customers), products, and opening stock. Transactional
 * history (purchases/sales/transfers/requisitions) is the next ETL step — add it
 * here following the same resolve-map → create → stamp-legacy-id pattern.
 *
 * Env: TARGET_TENANT_ID (required), TARGET_BRANCH_ID (optional, opening stock),
 * LEGACY_MYSQL_* (source), RLS_ENABLED should be false for the run.
 *
 * Run: `pnpm migrate:inventory`
 */
import { NestFactory } from '@nestjs/core';
import {
  createConnection,
  type Connection,
  type RowDataPacket,
} from 'mysql2/promise';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CategoryService } from '../src/modules/category/category.service';
import { SubCategoryService } from '../src/modules/sub-category/sub-category.service';
import { UnitService } from '../src/modules/unit/unit.service';
import { BrandService } from '../src/modules/brand/brand.service';
import { TaxRateService } from '../src/modules/tax-rate/tax-rate.service';
import { SupplierService } from '../src/modules/supplier/supplier.service';
import { CustomerService } from '../src/modules/customer/customer.service';
import { ProductService } from '../src/modules/product/product.service';
import { ProductStockService } from '../src/modules/product/product-stock.service';

const str = (v: unknown): string | undefined =>
  v == null ? undefined : String(v);
const num = (v: unknown): number => (v == null ? 0 : Number(v));

async function openLegacyDb(): Promise<Connection> {
  return createConnection({
    host: process.env.LEGACY_MYSQL_HOST ?? '127.0.0.1',
    port: parseInt(process.env.LEGACY_MYSQL_PORT ?? '3306', 10),
    user: process.env.LEGACY_MYSQL_USER,
    password: process.env.LEGACY_MYSQL_PASSWORD,
    database: process.env.LEGACY_MYSQL_DATABASE,
  });
}

async function main(): Promise<void> {
  const tenantId = process.env.TARGET_TENANT_ID;
  if (!tenantId) throw new Error('TARGET_TENANT_ID is required');
  const branchId = process.env.TARGET_BRANCH_ID; // for opening stock
  const prefix = process.env.LEGACY_MYSQL_TABLE_PREFIX ?? 'ez_';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const categories = app.get(CategoryService);
  const subCategories = app.get(SubCategoryService);
  const units = app.get(UnitService);
  const brands = app.get(BrandService);
  const taxRates = app.get(TaxRateService);
  const suppliers = app.get(SupplierService);
  const customers = app.get(CustomerService);
  const products = app.get(ProductService);
  const stock = app.get(ProductStockService);

  const legacy = await openLegacyDb();
  const summary: Record<string, { created: number; skipped: number }> = {};
  const bump = (k: string, created: boolean) => {
    const entry = (summary[k] ??= { created: 0, skipped: 0 });
    if (created) entry.created++;
    else entry.skipped++;
  };

  // id maps: legacy id → new id
  const categoryMap = new Map<string, string>();
  const taxMap = new Map<string, string>();
  const unitMap = new Map<string, string>();
  const brandMap = new Map<string, string>();
  const productMap = new Map<string, string>();
  const supplierMap = new Map<string, string>();
  const customerMap = new Map<string, string>();

  await prisma.runWithTenant(tenantId, async () => {
    // ── Categories ──
    const [catRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, code FROM ${prefix}categories`,
    );
    for (const row of catRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventoryCategory.findFirst({
        where: { tenantId, legacyCategoryId: legacyId },
        select: { id: true },
      });
      if (existing) {
        categoryMap.set(legacyId, existing.id);
        bump('categories', false);
        continue;
      }
      const cat = await categories.create(tenantId, {
        name: str(row.name) ?? `Category ${legacyId}`,
        code: str(row.code),
      });
      await prisma.inventoryCategory.update({
        where: { id: cat.id },
        data: { legacyCategoryId: legacyId },
      });
      categoryMap.set(legacyId, cat.id);
      bump('categories', true);
    }

    // ── Tax rates ──
    const [taxRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, rate, hsn_code FROM ${prefix}tax_rates`,
    );
    for (const row of taxRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventoryTaxRate.findFirst({
        where: { tenantId, legacyTaxRateId: legacyId },
        select: { id: true },
      });
      if (existing) {
        taxMap.set(legacyId, existing.id);
        bump('taxRates', false);
        continue;
      }
      const tax = await taxRates.create(tenantId, {
        name: str(row.name) ?? `Tax ${legacyId}`,
        rate: num(row.rate),
        hsnCode: str(row.hsn_code),
      });
      await prisma.inventoryTaxRate.update({
        where: { id: tax.id },
        data: { legacyTaxRateId: legacyId },
      });
      taxMap.set(legacyId, tax.id);
      bump('taxRates', true);
    }

    // ── Units ──
    const [unitRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, code FROM ${prefix}units`,
    );
    for (const row of unitRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventoryUnit.findFirst({
        where: { tenantId, legacyUnitId: legacyId },
        select: { id: true },
      });
      if (existing) {
        unitMap.set(legacyId, existing.id);
        bump('units', false);
        continue;
      }
      const unit = await units.create(tenantId, {
        name: str(row.name) ?? `Unit ${legacyId}`,
        code: str(row.code),
      });
      await prisma.inventoryUnit.update({
        where: { id: unit.id },
        data: { legacyUnitId: legacyId },
      });
      unitMap.set(legacyId, unit.id);
      bump('units', true);
    }

    // ── Brands ──
    const [brandRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, code FROM ${prefix}brands`,
    );
    for (const row of brandRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventoryBrand.findFirst({
        where: { tenantId, legacyBrandId: legacyId },
        select: { id: true },
      });
      if (existing) {
        brandMap.set(legacyId, existing.id);
        bump('brands', false);
        continue;
      }
      const brand = await brands.create(tenantId, {
        name: str(row.name) ?? `Brand ${legacyId}`,
        code: str(row.code),
      });
      await prisma.inventoryBrand.update({
        where: { id: brand.id },
        data: { legacyBrandId: legacyId },
      });
      brandMap.set(legacyId, brand.id);
      bump('brands', true);
    }

    // ── Sub-categories ──
    const [subRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, code, category_id FROM ${prefix}subcategories`,
    );
    for (const row of subRows) {
      const legacyId = String(row.id);
      const categoryId = categoryMap.get(String(row.category_id));
      if (!categoryId) {
        bump('subCategories(unmapped)', false);
        continue;
      }
      const existing = await prisma.inventorySubCategory.findFirst({
        where: { tenantId, legacySubCategoryId: legacyId },
        select: { id: true },
      });
      if (existing) {
        bump('subCategories', false);
        continue;
      }
      const sub = await subCategories.create(tenantId, {
        categoryId,
        name: str(row.name) ?? `Sub ${legacyId}`,
        code: str(row.code),
      });
      await prisma.inventorySubCategory.update({
        where: { id: sub.id },
        data: { legacySubCategoryId: legacyId },
      });
      bump('subCategories', true);
    }

    // ── Suppliers (companies group=supplier) ──
    const [supRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, company, phone, email FROM ${prefix}companies WHERE group_name = 'supplier'`,
    );
    for (const row of supRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventorySupplier.findFirst({
        where: { tenantId, legacySupplierId: legacyId },
        select: { id: true },
      });
      if (existing) {
        supplierMap.set(legacyId, existing.id);
        bump('suppliers', false);
        continue;
      }
      const sup = await suppliers.create(tenantId, {
        name: str(row.name) ?? `Supplier ${legacyId}`,
        companyName: str(row.company),
        phone: str(row.phone),
        email: str(row.email),
      });
      await prisma.inventorySupplier.update({
        where: { id: sup.id },
        data: { legacySupplierId: legacyId },
      });
      supplierMap.set(legacyId, sup.id);
      bump('suppliers', true);
    }

    // ── Customers (companies group=customer) ──
    const [custRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, name, company, phone, email FROM ${prefix}companies WHERE group_name = 'customer'`,
    );
    for (const row of custRows) {
      const legacyId = String(row.id);
      const existing = await prisma.inventoryCustomer.findFirst({
        where: { tenantId, legacyCustomerId: legacyId },
        select: { id: true },
      });
      if (existing) {
        customerMap.set(legacyId, existing.id);
        bump('customers', false);
        continue;
      }
      const cust = await customers.create(tenantId, {
        name: str(row.name) ?? `Customer ${legacyId}`,
        companyName: str(row.company),
        phone: str(row.phone),
        email: str(row.email),
      });
      await prisma.inventoryCustomer.update({
        where: { id: cust.id },
        data: { legacyCustomerId: legacyId },
      });
      customerMap.set(legacyId, cust.id);
      bump('customers', true);
    }

    // ── Products ──
    const [prodRows] = await legacy.query<RowDataPacket[]>(
      `SELECT id, code, name, category_id, unit, brand, tax_rate, cost, price, alert_quantity FROM ${prefix}products`,
    );
    for (const row of prodRows) {
      const legacyId = String(row.id);
      const categoryId = categoryMap.get(String(row.category_id));
      if (!categoryId) {
        bump('products(unmapped)', false);
        continue;
      }
      const existing = await prisma.inventoryProduct.findFirst({
        where: { tenantId, legacyProductId: legacyId },
        select: { id: true },
      });
      if (existing) {
        productMap.set(legacyId, existing.id);
        bump('products', false);
        continue;
      }
      const product = await products.create(tenantId, {
        code: str(row.code) ?? `P-${legacyId}`,
        name: str(row.name) ?? `Product ${legacyId}`,
        categoryId,
        unitId: unitMap.get(String(row.unit)),
        brandId: brandMap.get(String(row.brand)),
        taxRateId: taxMap.get(String(row.tax_rate)),
        cost: num(row.cost),
        price: num(row.price),
        alertQuantity: num(row.alert_quantity),
      });
      await prisma.inventoryProduct.update({
        where: { id: product.id },
        data: { legacyProductId: legacyId },
      });
      productMap.set(legacyId, product.id);
      bump('products', true);
    }

    // ── Opening stock (requires TARGET_BRANCH_ID) ──
    if (branchId) {
      const [whRows] = await legacy.query<RowDataPacket[]>(
        `SELECT product_id, quantity FROM ${prefix}warehouses_products WHERE quantity IS NOT NULL`,
      );
      for (const row of whRows) {
        const newProductId = productMap.get(String(row.product_id));
        const qty = num(row.quantity);
        if (!newProductId || qty === 0) {
          bump('openingStock(skipped)', false);
          continue;
        }
        await stock.recordAdjustment(tenantId, branchId, newProductId, {
          quantity: qty,
          reason: 'Opening stock (migration)',
        });
        bump('openingStock', true);
      }
    }

    // ── Transactional history (records only — stock is already captured by the
    //    opening-stock snapshot above, so these do NOT move stock) ──
    if (branchId) {
      // Snapshot product name/code for line items (new id → {name, code}).
      const prods = await prisma.inventoryProduct.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, code: true },
      });
      const info = new Map(prods.map((p) => [p.id, p]));
      const toBranchId = process.env.TARGET_TO_BRANCH_ID; // for transfers
      const paymentStatus = (grand: number, paid: number): string =>
        paid >= grand && grand > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

      // Purchases (+ items + payments)
      const [purRows] = await legacy.query<RowDataPacket[]>(
        `SELECT id, supplier_id, reference, date, grand_total, paid, status FROM ${prefix}purchases`,
      );
      for (const row of purRows) {
        const legacyId = String(row.id);
        const supplierId = supplierMap.get(String(row.supplier_id));
        if (!supplierId) {
          bump('purchases(unmapped)', false);
          continue;
        }
        const existing = await prisma.inventoryPurchase.findFirst({
          where: { tenantId, legacyPurchaseId: legacyId },
          select: { id: true },
        });
        if (existing) {
          bump('purchases', false);
          continue;
        }
        const [itemRows] = await legacy.query<RowDataPacket[]>(
          `SELECT product_id, quantity, cost FROM ${prefix}purchase_items WHERE purchase_id = ?`,
          [row.id],
        );
        const lines = itemRows
          .map((it) => {
            const pid = productMap.get(String(it.product_id));
            if (!pid) return null;
            const qty = num(it.quantity);
            const cost = num(it.cost);
            const meta = info.get(pid);
            return {
              tenantId,
              productId: pid,
              productName: meta?.name ?? 'Product',
              productCode: meta?.code,
              quantity: qty,
              cost,
              subtotal: qty * cost,
            };
          })
          .filter((l): l is NonNullable<typeof l> => l !== null);
        const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
        const grand = row.grand_total != null ? num(row.grand_total) : subtotal;
        const paid = num(row.paid);
        const [payRows] = await legacy.query<RowDataPacket[]>(
          `SELECT amount, paid_by, date FROM ${prefix}purchase_payments WHERE purchase_id = ?`,
          [row.id],
        );
        const payments = payRows.map((pm) => ({
          tenantId,
          amount: num(pm.amount),
          method: str(pm.paid_by) ?? 'CASH',
          date: pm.date ? new Date(pm.date) : new Date(),
        }));
        const created = await prisma.inventoryPurchase.create({
          data: {
            tenantId,
            branchId,
            supplierId,
            reference: str(row.reference) ?? `PO-${legacyId}`,
            date: row.date ? new Date(row.date) : new Date(),
            status: str(row.status) ?? 'RECEIVED',
            subtotal,
            grandTotal: grand,
            paid,
            paymentStatus: paymentStatus(grand, paid),
            legacyPurchaseId: legacyId,
            items: { create: lines },
            payments: payments.length ? { create: payments } : undefined,
          },
          select: { id: true },
        });
        void created;
        bump('purchases', true);
      }

      // Sales (+ items + payments)
      const [saleRows] = await legacy.query<RowDataPacket[]>(
        `SELECT id, customer_id, reference, date, grand_total, paid, status FROM ${prefix}sales`,
      );
      for (const row of saleRows) {
        const legacyId = String(row.id);
        const customerId = customerMap.get(String(row.customer_id));
        if (!customerId) {
          bump('sales(unmapped)', false);
          continue;
        }
        const existing = await prisma.inventorySale.findFirst({
          where: { tenantId, legacySaleId: legacyId },
          select: { id: true },
        });
        if (existing) {
          bump('sales', false);
          continue;
        }
        const [itemRows] = await legacy.query<RowDataPacket[]>(
          `SELECT product_id, quantity, price FROM ${prefix}sale_items WHERE sale_id = ?`,
          [row.id],
        );
        const lines = itemRows
          .map((it) => {
            const pid = productMap.get(String(it.product_id));
            if (!pid) return null;
            const qty = num(it.quantity);
            const price = num(it.price);
            const meta = info.get(pid);
            return {
              tenantId,
              productId: pid,
              productName: meta?.name ?? 'Product',
              productCode: meta?.code,
              quantity: qty,
              price,
              subtotal: qty * price,
            };
          })
          .filter((l): l is NonNullable<typeof l> => l !== null);
        const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
        const grand = row.grand_total != null ? num(row.grand_total) : subtotal;
        const paid = num(row.paid);
        const [payRows] = await legacy.query<RowDataPacket[]>(
          `SELECT amount, paid_by, date FROM ${prefix}sale_payments WHERE sale_id = ?`,
          [row.id],
        );
        const payments = payRows.map((pm) => ({
          tenantId,
          amount: num(pm.amount),
          method: str(pm.paid_by) ?? 'CASH',
          date: pm.date ? new Date(pm.date) : new Date(),
        }));
        await prisma.inventorySale.create({
          data: {
            tenantId,
            branchId,
            customerId,
            reference: str(row.reference) ?? `SALE-${legacyId}`,
            date: row.date ? new Date(row.date) : new Date(),
            status: str(row.status) ?? 'COMPLETED',
            subtotal,
            grandTotal: grand,
            paid,
            paymentStatus: paymentStatus(grand, paid),
            legacySaleId: legacyId,
            items: { create: lines },
            payments: payments.length ? { create: payments } : undefined,
          },
          select: { id: true },
        });
        bump('sales', true);
      }

      // Requisitions (+ items)
      const [reqRows] = await legacy.query<RowDataPacket[]>(
        `SELECT id, reference, date, status FROM ${prefix}requisitions`,
      );
      for (const row of reqRows) {
        const legacyId = String(row.id);
        const existing = await prisma.inventoryRequisition.findFirst({
          where: { tenantId, legacyRequisitionId: legacyId },
          select: { id: true },
        });
        if (existing) {
          bump('requisitions', false);
          continue;
        }
        const [itemRows] = await legacy.query<RowDataPacket[]>(
          `SELECT product_id, quantity FROM ${prefix}requisition_items WHERE requisition_id = ?`,
          [row.id],
        );
        const lines = itemRows
          .map((it) => {
            const pid = productMap.get(String(it.product_id));
            if (!pid) return null;
            const meta = info.get(pid);
            return {
              tenantId,
              productId: pid,
              productName: meta?.name ?? 'Product',
              productCode: meta?.code,
              quantity: num(it.quantity),
            };
          })
          .filter((l): l is NonNullable<typeof l> => l !== null);
        await prisma.inventoryRequisition.create({
          data: {
            tenantId,
            branchId,
            reference: str(row.reference) ?? `REQ-${legacyId}`,
            date: row.date ? new Date(row.date) : new Date(),
            status: str(row.status) ?? 'RECEIVED',
            legacyRequisitionId: legacyId,
            items: { create: lines },
          },
          select: { id: true },
        });
        bump('requisitions', true);
      }

      // Transfers (+ items) — needs TARGET_TO_BRANCH_ID for the destination.
      if (toBranchId) {
        const [trRows] = await legacy.query<RowDataPacket[]>(
          `SELECT id, reference, date, status FROM ${prefix}transfers`,
        );
        for (const row of trRows) {
          const legacyId = String(row.id);
          const existing = await prisma.inventoryTransfer.findFirst({
            where: { tenantId, legacyTransferId: legacyId },
            select: { id: true },
          });
          if (existing) {
            bump('transfers', false);
            continue;
          }
          const [itemRows] = await legacy.query<RowDataPacket[]>(
            `SELECT product_id, quantity FROM ${prefix}transfer_items WHERE transfer_id = ?`,
            [row.id],
          );
          const lines = itemRows
            .map((it) => {
              const pid = productMap.get(String(it.product_id));
              if (!pid) return null;
              const meta = info.get(pid);
              return {
                tenantId,
                productId: pid,
                productName: meta?.name ?? 'Product',
                productCode: meta?.code,
                quantity: num(it.quantity),
              };
            })
            .filter((l): l is NonNullable<typeof l> => l !== null);
          await prisma.inventoryTransfer.create({
            data: {
              tenantId,
              fromBranchId: branchId,
              toBranchId,
              reference: str(row.reference) ?? `TR-${legacyId}`,
              date: row.date ? new Date(row.date) : new Date(),
              status: str(row.status) ?? 'COMPLETED',
              legacyTransferId: legacyId,
              items: { create: lines },
            },
            select: { id: true },
          });
          bump('transfers', true);
        }
      }
    }
  });

  await legacy.end();
  await app.close();

  console.log('Migration summary:');
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: created ${v.created}, skipped ${v.skipped}`);
  }
}

void main();
