import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { tenantContext } from './tenant-context';

/** RLS is opt-in via env so it can be rolled out deliberately. */
function rlsEnabled(): boolean {
  return process.env.RLS_ENABLED === 'true';
}

/**
 * Thin wrapper around the generated Prisma client (CLAUDE.md rule #4 — Prisma
 * only). Inject it via `PrismaModule`; never instantiate `new PrismaClient()`
 * elsewhere.
 *
 * ## Tenant isolation (CLAUDE.md §4.3)
 *
 * Postgres RLS keys every tenant-scoped `inventory_*` table on
 * `app.current_tenant_id`. When `RLS_ENABLED=true`, this service installs a
 * Prisma client extension that, for each query, sets that GUC from the
 * per-request `tenantContext` (`AsyncLocalStorage`) inside the same transaction
 * as the query — so the policies in `prisma/rls.sql` resolve. Model access is
 * transparently routed to the extended client via a Proxy, so services keep
 * calling `this.prisma.<model>`.
 *
 * This is a verbatim port of the kalnostics-new PrismaService so both services,
 * sharing one database, enforce isolation the same way.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    if (!rlsEnabled()) {
      return;
    }

    /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
    const extended = this.$extends({
      query: {
        $allOperations: async ({ args, query }) => {
          const store = tenantContext.getStore();
          const tenantId = store?.tenantId;
          if (!tenantId || store?.rlsTxActive) {
            return query(args);
          }
          const [, result] = await this.$transaction([
            this
              .$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (
          typeof prop === 'string' &&
          !prop.startsWith('$') &&
          prop in extended &&
          !(prop in (target.constructor as { prototype: object }).prototype)
        ) {
          return (extended as Record<string, unknown>)[prop];
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
  }

  /** Open the database connection on startup. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Close the database connection on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Run `work` inside a transaction with the RLS tenant context set, so
   * `current_setting('app.current_tenant_id')` resolves for the policies in
   * `prisma/rls.sql`. Use this for any multi-statement write on tenant-scoped
   * data; the callback receives the transaction client.
   *
   * @param tenantId the active tenant (from the JWT `tenant_id`)
   * @param work callback receiving the transaction-scoped Prisma client
   * @param options optional `$transaction` overrides (e.g. a longer `timeout`
   * for a bulk write like a CSV import).
   */
  async withTenant<T>(
    tenantId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return tenantContext.run(
        { ...tenantContext.getStore(), tenantId, rlsTxActive: true },
        () => work(tx),
      );
    }, options);
  }

  /**
   * Run `work` with the RLS tenant context set (via `AsyncLocalStorage`) but
   * WITHOUT a wrapping transaction — each model call inside gets its own
   * tenant-GUC transaction through the RLS extension. Use for cross-tenant reads
   * that delegate to tenant-scoped services (e.g. the migration script).
   */
  runWithTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
    return tenantContext.run({ tenantId }, work);
  }
}
