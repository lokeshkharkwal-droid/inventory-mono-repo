/**
 * Applies pending `prisma/migrations/NNNN_* /migration.sql` files to the SHARED
 * kalnostics-new Postgres database.
 *
 * Why not `prisma migrate deploy`? The `_prisma_migrations` table in this DB is
 * owned by kalnostics-new; touching it would corrupt their migration history.
 * Instead, inventory keeps its own ledger in `inventory_schema_migrations`.
 *
 * Each migration runs in a single transaction together with its ledger insert
 * (via `prisma db execute`), so a failed migration leaves no partial schema and
 * is not recorded.
 *
 * Usage (from apps/backend):
 *   pnpm migrate:schema                       # apply all pending migrations
 *   pnpm migrate:schema --status              # list applied / pending, change nothing
 *   pnpm migrate:schema --baseline 0017_x     # one-time: mark <= 0017_x as applied
 *                                             # WITHOUT running them (DB already has them)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const BACKEND_DIR = join(__dirname, '..');
const MIGRATIONS_DIR = join(BACKEND_DIR, 'prisma', 'migrations');
const SCHEMA_PATH = join(BACKEND_DIR, 'prisma', 'schema.prisma');
const LEDGER = 'inventory_schema_migrations';
const PRISMA_BIN = join(BACKEND_DIR, 'node_modules', '.bin', 'prisma');

interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

function loadMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}_/.test(d.name))
    .map((d) => d.name)
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Runs a multi-statement SQL script through the Prisma CLI (one connection). */
function execSqlScript(sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'inv-migrate-'));
  const file = join(dir, 'script.sql');
  try {
    writeFileSync(file, sql);
    execFileSync(PRISMA_BIN, ['db', 'execute', '--file', file, '--schema', SCHEMA_PATH], {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv: string[]): { status: boolean; baseline?: string } {
  const status = argv.includes('--status');
  const i = argv.indexOf('--baseline');
  const baseline = i >= 0 ? argv[i + 1] : undefined;
  if (i >= 0 && !baseline) throw new Error('--baseline requires a migration name');
  return { status, baseline };
}

async function main(): Promise<void> {
  const { status, baseline } = parseArgs(process.argv.slice(2));
  const migrations = loadMigrations();
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${LEDGER}" (
        "name"       TEXT PRIMARY KEY,
        "checksum"   TEXT NOT NULL,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const rows = await prisma.$queryRawUnsafe<{ name: string; checksum: string }[]>(
      `SELECT "name", "checksum" FROM "${LEDGER}"`,
    );
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    // ── One-time baseline for a DB whose schema was applied by hand ──
    if (baseline) {
      const upTo = migrations.filter((m) => m.name <= baseline);
      if (!migrations.some((m) => m.name === baseline)) {
        throw new Error(`Unknown migration "${baseline}"`);
      }
      const values = upTo
        .filter((m) => !applied.has(m.name))
        .map((m) => `(${sqlLiteral(m.name)}, ${sqlLiteral(m.checksum)})`);
      if (values.length > 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${LEDGER}" ("name", "checksum") VALUES ${values.join(', ')}`,
        );
      }
      console.log(`Baselined ${values.length} migration(s) up to ${baseline} (not executed).`);
      return;
    }

    // ── Safety: refuse to replay migrations onto a hand-migrated DB ──
    if (applied.size === 0) {
      const [{ exists }] = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
        `SELECT to_regclass('public.inventory_categories') IS NOT NULL AS "exists"`,
      );
      if (exists) {
        throw new Error(
          `inventory_* tables exist but "${LEDGER}" is empty. The schema was applied ` +
            `manually; record what is already there first, e.g.\n` +
            `  pnpm migrate:schema --baseline <last-applied-migration>`,
        );
      }
    }

    for (const m of migrations) {
      const prev = applied.get(m.name);
      if (prev && prev !== m.checksum) {
        console.warn(`WARNING: ${m.name} was modified after it was applied (checksum mismatch).`);
      }
    }

    const pending = migrations.filter((m) => !applied.has(m.name));

    if (status) {
      console.log(`Applied: ${applied.size}  Pending: ${pending.length}`);
      for (const m of pending) console.log(`  pending  ${m.name}`);
      return;
    }

    if (pending.length === 0) {
      console.log(`Schema up to date (${applied.size} migration(s) applied).`);
      return;
    }

    for (const m of pending) {
      console.log(`Applying ${m.name} ...`);
      execSqlScript(
        [
          'BEGIN;',
          m.sql,
          `INSERT INTO "${LEDGER}" ("name", "checksum") VALUES (${sqlLiteral(m.name)}, ${sqlLiteral(m.checksum)});`,
          'COMMIT;',
        ].join('\n'),
      );
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
