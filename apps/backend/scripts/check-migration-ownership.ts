/**
 * CI guard (Master plan §3.3): inventory-backend must manage ONLY `inventory_*`
 * tables in the shared kalnostics-new database. This script scans every
 * migration SQL and fails if a CREATE/ALTER/DROP TABLE targets a table whose
 * name does not start with `inventory_` — preventing an inventory migration from
 * ever touching a kalnostics-owned table.
 *
 * Run via `pnpm check:migration-ownership` (wire into CI before deploy).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');
const ALLOWED_PREFIX = 'inventory_';

/** Matches `CREATE TABLE "x"`, `ALTER TABLE x`, `DROP TABLE IF EXISTS "x"`, etc. */
const TABLE_STMT =
  /\b(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/gi;

function collectSqlFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // no migrations yet
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSqlFiles(full));
    } else if (entry.endsWith('.sql')) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const files = collectSqlFiles(MIGRATIONS_DIR);
  const violations: string[] = [];

  for (const file of files) {
    const sql = readFileSync(file, 'utf8');
    let match: RegExpExecArray | null;
    TABLE_STMT.lastIndex = 0;
    while ((match = TABLE_STMT.exec(sql)) !== null) {
      const table = match[1];
      if (table && !table.startsWith(ALLOWED_PREFIX)) {
        violations.push(`  ${file}: table "${table}" is not inventory-owned`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      'Migration ownership check FAILED — inventory migrations may only touch inventory_* tables:',
    );
    console.error(violations.join('\n'));
    process.exit(1);
  }

  console.log(
    `Migration ownership check passed (${files.length} migration file(s) scanned).`,
  );
}

main();
