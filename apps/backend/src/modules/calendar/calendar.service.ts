import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarQueryDto,
} from './dto/calendar.dto';

/** 404 — calendar event not found in this tenant. */
class CalendarEventNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'CALENDAR_EVENT_NOT_FOUND',
      'Calendar event not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Calendar events — tenant-scoped, branch-level, soft-delete aware. */
@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateCalendarEventDto,
    actorId?: string,
  ) {
    return this.prisma.inventoryCalendarEvent.create({
      data: {
        tenantId,
        branchId,
        title: dto.title,
        description: dto.description,
        color: dto.color,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        isAllDay: dto.isAllDay ?? false,
        createdBy: actorId,
      },
    });
  }

  /** List events, optionally within a [from, to] window (for the calendar view). */
  async findAll(tenantId: string, query: CalendarQueryDto) {
    const where: Prisma.InventoryCalendarEventWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.from || query.to) {
      where.startAt = {};
      if (query.from) where.startAt.gte = new Date(query.from);
      if (query.to) where.startAt.lte = new Date(query.to);
    }
    return this.prisma.inventoryCalendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const event = await this.prisma.inventoryCalendarEvent.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!event) throw new CalendarEventNotFoundException(id);
    return event;
  }

  async update(id: string, tenantId: string, dto: UpdateCalendarEventDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCalendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        color: dto.color,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        isAllDay: dto.isAllDay,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCalendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
