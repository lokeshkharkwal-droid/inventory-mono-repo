import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Maintains the platform-level `inventory_tenant_registry` — the list of tenants
 * that have inventory activity. It is NOT tenant-scoped / RLS'd, so the
 * cross-tenant alert cron can enumerate tenants without a request context (the
 * inventory app does not own the kalnostics `tenants` table).
 */
@Injectable()
export class TenantRegistryService {
  private readonly logger = new Logger(TenantRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Record (or refresh) a tenant's presence. Fire-and-forget; never throws. */
  async register(tenantId: string): Promise<void> {
    try {
      await this.prisma.inventoryTenantRegistry.upsert({
        where: { tenantId },
        create: { tenantId },
        update: { lastSeenAt: new Date() },
      });
    } catch (err) {
      // Non-critical: a failed registry write must not break the caller's flow.
      this.logger.warn(
        `Failed to register tenant ${tenantId}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
  }

  /** All known tenant ids (enumeration source for the alert cron). */
  async listTenantIds(): Promise<string[]> {
    const rows = await this.prisma.inventoryTenantRegistry.findMany({
      select: { tenantId: true },
    });
    return rows.map((r) => r.tenantId);
  }
}
