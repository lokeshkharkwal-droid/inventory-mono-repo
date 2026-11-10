import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';

/** 404 — notification not found in this tenant. */
class NotificationNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'NOTIFICATION_NOT_FOUND',
      'Notification not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * In-app notifications — tenant-scoped. Alerts are created by the alert cron (via
 * {@link createDeduped}, keyed so a recurring alert isn't duplicated each run);
 * users list, count, and mark them read.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryNotificationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryNotification.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  /** Count of unread notifications (drives the bell badge). */
  async unreadCount(tenantId: string): Promise<{ count: number }> {
    const count = await this.prisma.inventoryNotification.count({
      where: { tenantId, deletedAt: null, isRead: false },
    });
    return { count };
  }

  async create(tenantId: string, dto: CreateNotificationDto) {
    return this.prisma.inventoryNotification.create({
      data: {
        tenantId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        link: dto.link,
      },
    });
  }

  /** Mark one notification read. */
  async markRead(id: string, tenantId: string) {
    const existing = await this.prisma.inventoryNotification.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotificationNotFoundException(id);
    return this.prisma.inventoryNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Mark all of a tenant's notifications read. */
  async markAllRead(tenantId: string): Promise<{ updated: number }> {
    const res = await this.prisma.inventoryNotification.updateMany({
      where: { tenantId, deletedAt: null, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: res.count };
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.prisma.inventoryNotification.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotificationNotFoundException(id);
    return this.prisma.inventoryNotification.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  /**
   * Create a notification only if an unread one with the same `dedupeKey` does
   * not already exist for the tenant — used by the alert cron so a standing
   * low-stock/expiry condition produces one live alert, not one per run. Must be
   * called inside a tenant RLS context (the cron uses `withTenant`).
   */
  async createDeduped(
    tx: Prisma.TransactionClient,
    tenantId: string,
    data: {
      type: string;
      title: string;
      body?: string;
      link?: string;
      dedupeKey: string;
    },
  ): Promise<boolean> {
    const existing = await tx.inventoryNotification.findFirst({
      where: {
        tenantId,
        dedupeKey: data.dedupeKey,
        isRead: false,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return false;
    await tx.inventoryNotification.create({ data: { tenantId, ...data } });
    return true;
  }
}
