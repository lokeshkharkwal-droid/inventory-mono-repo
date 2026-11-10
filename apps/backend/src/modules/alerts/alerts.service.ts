import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { TenantRegistryService } from './tenant-registry.service';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** How many days ahead counts as "near expiry" for the daily alert. */
const EXPIRY_WINDOW_DAYS = 30;

/**
 * Scheduled stock alerts (legacy Cron parity). Once a day it scans every tenant
 * in the registry for low-stock and near-expiry conditions and raises in-app
 * notifications — de-duplicated so a standing condition yields one live alert,
 * not one per run. RLS-safe: it enumerates tenants from the non-RLS registry and
 * processes each inside `withTenant`, so every query is tenant-scoped.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly registry: TenantRegistryService,
  ) {}

  /** Daily at 07:00 server time. */
  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'inventory-stock-alerts' })
  async runDailyAlerts(): Promise<void> {
    const tenantIds = await this.registry.listTenantIds();
    this.logger.log(`Running stock alerts for ${tenantIds.length} tenant(s)`);
    let raised = 0;
    for (const tenantId of tenantIds) {
      try {
        raised += await this.scanTenant(tenantId);
      } catch (err) {
        this.logger.error(
          `Alert scan failed for tenant ${tenantId}: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
      }
    }
    this.logger.log(`Stock alerts complete — ${raised} notification(s) raised`);
  }

  /**
   * Scan a single tenant for low-stock + near-expiry and raise notifications.
   * Returns the number of new notifications created. Public so it can be invoked
   * on demand (e.g. a manual "run alerts now" action or a test).
   */
  async scanTenant(tenantId: string): Promise<number> {
    return this.prisma.withTenant(tenantId, async (tx) => {
      let created = 0;

      // Low stock: products at/below their reorder alert level.
      const products = await tx.inventoryProduct.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          alertQuantity: true,
          warehouseStocks: {
            where: { deletedAt: null },
            select: { quantity: true },
          },
        },
      });
      for (const p of products) {
        const total = p.warehouseStocks.reduce(
          (s, w) => s.add(w.quantity),
          D(0),
        );
        if (total.lte(p.alertQuantity)) {
          const made = await this.notifications.createDeduped(tx, tenantId, {
            type: 'LOW_STOCK',
            title: `Low stock: ${p.name}`,
            body: `${p.code} is at ${total.toString()} (reorder at ${p.alertQuantity.toString()}).`,
            link: '/products',
            dedupeKey: `LOW_STOCK:${p.id}`,
          });
          if (made) created++;
        }
      }

      // Near expiry: batches expiring within the window with stock on hand.
      const until = new Date(Date.now() + EXPIRY_WINDOW_DAYS * 86_400_000);
      const batches = await tx.inventoryProductBatch.findMany({
        where: {
          tenantId,
          deletedAt: null,
          quantity: { gt: 0 },
          expiryDate: { not: null, lte: until },
        },
        select: {
          id: true,
          batchNo: true,
          expiryDate: true,
          product: { select: { name: true } },
        },
      });
      for (const b of batches) {
        const made = await this.notifications.createDeduped(tx, tenantId, {
          type: 'EXPIRY',
          title: `Expiring soon: ${b.product.name}`,
          body: `Batch ${b.batchNo ?? '—'} expires ${b.expiryDate?.toISOString().slice(0, 10)}.`,
          link: '/reports',
          dedupeKey: `EXPIRY:${b.id}`,
        });
        if (made) created++;
      }

      return created;
    });
  }
}
