/**
 * Migration dry-run (read-only pre-flight). Connects to the legacy MySQL source
 * and reports the row counts that `migrate:inventory` WOULD process, grouped the
 * same way the migration reads them — WITHOUT writing to Postgres. Pair it with
 * `reconcile:inventory` (the post-flight count check) around a real run.
 *
 * It intentionally does NOT open a Nest/Prisma context, so it is safe to run
 * against production legacy data at any time.
 *
 * Env: LEGACY_MYSQL_* (source), optional LEGACY_MYSQL_TABLE_PREFIX (default ez_).
 * Run: `pnpm preview:inventory`
 */
import { createConnection, type RowDataPacket } from 'mysql2/promise';

async function count(
  conn: Awaited<ReturnType<typeof createConnection>>,
  sql: string,
): Promise<number> {
  try {
    const [rows] = await conn.query<RowDataPacket[]>(sql);
    return Number(rows[0]?.c ?? 0);
  } catch (err) {
    // A missing table in a given tenant DB is reported as n/a, not a crash.
    console.warn(
      `  (skip) ${sql}: ${err instanceof Error ? err.message : 'query failed'}`,
    );
    return -1;
  }
}

async function main(): Promise<void> {
  const p = process.env.LEGACY_MYSQL_TABLE_PREFIX ?? 'ez_';
  const database = process.env.LEGACY_MYSQL_DATABASE;
  if (!database) throw new Error('LEGACY_MYSQL_DATABASE is required');

  const legacy = await createConnection({
    host: process.env.LEGACY_MYSQL_HOST ?? '127.0.0.1',
    port: parseInt(process.env.LEGACY_MYSQL_PORT ?? '3306', 10),
    user: process.env.LEGACY_MYSQL_USER,
    password: process.env.LEGACY_MYSQL_PASSWORD,
    database,
  });

  // Mirror every source table the migration reads (migrate-inventory.ts).
  const sources: { label: string; sql: string }[] = [
    { label: 'categories', sql: `SELECT COUNT(*) c FROM ${p}categories` },
    { label: 'subcategories', sql: `SELECT COUNT(*) c FROM ${p}subcategories` },
    { label: 'units', sql: `SELECT COUNT(*) c FROM ${p}units` },
    { label: 'brands', sql: `SELECT COUNT(*) c FROM ${p}brands` },
    { label: 'tax_rates', sql: `SELECT COUNT(*) c FROM ${p}tax_rates` },
    {
      label: 'suppliers',
      sql: `SELECT COUNT(*) c FROM ${p}companies WHERE group_name='supplier'`,
    },
    {
      label: 'customers',
      sql: `SELECT COUNT(*) c FROM ${p}companies WHERE group_name='customer'`,
    },
    { label: 'products', sql: `SELECT COUNT(*) c FROM ${p}products` },
    {
      label: 'opening_stock',
      sql: `SELECT COUNT(*) c FROM ${p}warehouses_products`,
    },
    { label: 'purchases', sql: `SELECT COUNT(*) c FROM ${p}purchases` },
    { label: 'purchase_items', sql: `SELECT COUNT(*) c FROM ${p}purchase_items` },
    {
      label: 'purchase_payments',
      sql: `SELECT COUNT(*) c FROM ${p}purchase_payments`,
    },
    { label: 'sales', sql: `SELECT COUNT(*) c FROM ${p}sales` },
    { label: 'sale_items', sql: `SELECT COUNT(*) c FROM ${p}sale_items` },
    { label: 'sale_payments', sql: `SELECT COUNT(*) c FROM ${p}sale_payments` },
    { label: 'transfers', sql: `SELECT COUNT(*) c FROM ${p}transfers` },
    { label: 'transfer_items', sql: `SELECT COUNT(*) c FROM ${p}transfer_items` },
    { label: 'requisitions', sql: `SELECT COUNT(*) c FROM ${p}requisitions` },
    {
      label: 'requisition_items',
      sql: `SELECT COUNT(*) c FROM ${p}requisition_items`,
    },
  ];

  console.log(`Migration dry-run — legacy source: ${database} (prefix "${p}")\n`);
  let total = 0;
  for (const s of sources) {
    const c = await count(legacy, s.sql);
    if (c >= 0) total += c;
    console.log(
      `  ${s.label.padEnd(18)} ${c < 0 ? 'n/a'.padStart(9) : String(c).padStart(9)}`,
    );
  }
  console.log(`\n  ${'TOTAL rows'.padEnd(18)} ${String(total).padStart(9)}`);
  console.log(
    '\nNo data was written. Run `pnpm migrate:inventory` to migrate, then' +
      ' `pnpm reconcile:inventory` to verify counts match.',
  );

  await legacy.end();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
