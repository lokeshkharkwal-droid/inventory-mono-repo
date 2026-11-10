import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import {
  CreateDeliveryDto,
  DeliveryQueryDto,
  UpdateDeliveryStatusDto,
} from './dto/delivery.dto';
import { SaleNotFoundException } from './exceptions/sale.exceptions';

/** 404 — delivery not found. */
export class DeliveryNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'DELIVERY_NOT_FOUND',
      'Delivery not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Delivery records for sales. */
@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateDeliveryDto,
    actorId?: string,
  ) {
    const sale = await this.prisma.inventorySale.findFirst({
      where: { id: dto.saleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!sale) throw new SaleNotFoundException(dto.saleId);

    return this.prisma.inventorySaleDelivery.create({
      data: {
        tenantId,
        branchId,
        saleId: dto.saleId,
        reference: dto.reference ?? generateReference('DLV'),
        status: dto.status ?? 'PENDING',
        trackingNo: dto.trackingNo,
        deliveredTo: dto.deliveredTo,
        address: dto.address,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
        createdBy: actorId,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: DeliveryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySaleDeliveryWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.saleId ? { saleId: query.saleId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySaleDelivery.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventorySaleDelivery.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const delivery = await this.prisma.inventorySaleDelivery.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!delivery) throw new DeliveryNotFoundException(id);
    return this.prisma.inventorySaleDelivery.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
