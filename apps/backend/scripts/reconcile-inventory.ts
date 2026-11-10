/**
 * Post-migration reconciliation: compares legacy MySQL row counts against the
 * migrated Postgres rows (those carrying a `legacy*` id) for the target tenant,
 * and reports any gaps. Run after `pnpm migrate:inventory`.
 *
 * Env: TARGET_TENANT_ID (required), LEGACY_MYSQL_* (source).
 * Run: `pnpm reconcile:inventory`
 */
import { NestFactory } from '@nestjs/core';
import { createConnection, type RowDataPacket } from 'mysql2/promise';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function legacyCount(
  conn: Awaited<ReturnType<typeof createConnection>>,
  sql: string,
): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(sql);
  return Number(rows[0]?.c ?? 0);
}

/** Round to 4 dp (matches the Decimal(18,4) stock columns) for checksum compares. */
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

async function main(): Promise<void> {
  const tenantId = process.env.TARGET_TENANT_ID;
  if (!tenantId) throw new Error('TARGET_TENANT_ID is required');
  const p = process.env.LEGACY_MYSQL_TABLE_PREFIX ?? 'ez_';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const legacy = await createConnection({
    host: process.env.LEGACY_MYSQL_HOST ?? '127.0.0.1',
    port: parseInt(process.env.LEGACY_MYSQL_PORT ?? '3306', 10),
    user: process.env.LEGACY_MYSQL_USER,
    password: process.env.LEGACY_MYSQL_PASSWORD,
    database: process.env.LEGACY_MYSQL_DATABASE,
  });

  const checks: { label: string; legacy: number; migrated: number }[] = [];

  checks.push({
    label: 'categories',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}categories`),
    migrated: await prisma.inventoryCategory.count({
      where: { tenantId, legacyCategoryId: { not: null } },
    }),
  });
  checks.push({
    label: 'subcategories',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}subcategories`),
    migrated: await prisma.inventorySubCategory.count({
      where: { tenantId, legacySubCategoryId: { not: null } },
    }),
  });
  checks.push({
    label: 'units',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}units`),
    migrated: await prisma.inventoryUnit.count({
      where: { tenantId, legacyUnitId: { not: null } },
    }),
  });
  checks.push({
    label: 'brands',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}brands`),
    migrated: await prisma.inventoryBrand.count({
      where: { tenantId, legacyBrandId: { not: null } },
    }),
  });
  checks.push({
    label: 'tax_rates',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}tax_rates`),
    migrated: await prisma.inventoryTaxRate.count({
      where: { tenantId, legacyTaxRateId: { not: null } },
    }),
  });
  checks.push({
    label: 'suppliers',
    legacy: await legacyCount(
      legacy,
      `SELECT COUNT(*) c FROM ${p}companies WHERE group_name='supplier'`,
    ),
    migrated: await prisma.inventorySupplier.count({
      where: { tenantId, legacySupplierId: { not: null } },
    }),
  });
  checks.push({
    label: 'customers',
    legacy: await legacyCount(
      legacy,
      `SELECT COUNT(*) c FROM ${p}companies WHERE group_name='customer'`,
    ),
    migrated: await prisma.inventoryCustomer.count({
      where: { tenantId, legacyCustomerId: { not: null } },
    }),
  });
  checks.push({
    label: 'products',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}products`),
    migrated: await prisma.inventoryProduct.count({
      where: { tenantId, legacyProductId: { not: null } },
    }),
  });
  checks.push({
    label: 'purchases',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}purchases`),
    migrated: await prisma.inventoryPurchase.count({
      where: { tenantId, legacyPurchaseId: { not: null } },
    }),
  });
  checks.push({
    label: 'sales',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}sales`),
    migrated: await prisma.inventorySale.count({
      where: { tenantId, legacySaleId: { not: null } },
    }),
  });
  checks.push({
    label: 'requisitions',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}requisitions`),
    migrated: await prisma.inventoryRequisition.count({
      where: { tenantId, legacyRequisitionId: { not: null } },
    }),
  });
  checks.push({
    label: 'transfers',
    legacy: await legacyCount(legacy, `SELECT COUNT(*) c FROM ${p}transfers`),
    migrated: await prisma.inventoryTransfer.count({
      where: { tenantId, legacyTransferId: { not: null } },
    }),
  });

  // Stock-balance checksum (plan §8): total legacy opening-stock quantity vs the
  // migrated on-hand quantity for the tenant. They must match to the 4th decimal.
  const [legacyStockRows] = await legacy.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(quantity),0) c FROM ${p}warehouses_products`,
  );
  const legacyStock = round4(Number(legacyStockRows[0]?.c ?? 0));
  const migratedAgg = await prisma.inventoryWarehouseProduct.aggregate({
    where: { tenantId, deletedAt: null },
    _sum: { quantity: true },
  });
  const migratedStock = round4(Number(migratedAgg._sum.quantity ?? 0));

  await legacy.end();
  await app.close();

  let ok = true;
  console.log('Reconciliation (legacy → migrated):');
  for (const c of checks) {
    const gap = c.legacy - c.migrated;
    if (gap !== 0) ok = false;
    console.log(
      `  ${c.label.padEnd(16)} legacy ${String(c.legacy).padStart(7)} | migrated ${String(
        c.migrated,
      ).padStart(7)} | gap ${gap}`,
    );
  }

  const stockGap = round4(legacyStock - migratedStock);
  if (stockGap !== 0) ok = false;
  console.log(
    `  ${'stock (qty sum)'.padEnd(16)} legacy ${String(legacyStock).padStart(7)} | migrated ${String(
      migratedStock,
    ).padStart(7)} | gap ${stockGap}`,
  );

  console.log(ok ? '\nAll reconciled ✅' : '\nGaps found — review above ⚠️');
  process.exit(ok ? 0 : 1);
}

void main();
