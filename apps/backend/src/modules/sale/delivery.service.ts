import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { resolveUserName } from '../../common/utils/party-detail.util';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
import { KalnosticsPrintTemplateClient } from '../../integration/clients/kalnostics-print-template.client';
import {
  CreateDeliveryDto,
  DeliveryQueryDto,
  UpdateDeliveryDto,
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

/** Delivery records for sales (EZHT `sales/*_delivery`). */
@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersClient: KalnosticsUsersClient,
    private readonly printTemplateClient: KalnosticsPrintTemplateClient,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateDeliveryDto,
    actorId?: string,
  ) {
    const sale = await this.prisma.inventorySale.findFirst({
      where: { id: dto.saleId, tenantId, deletedAt: null },
      select: { id: true, reference: true },
    });
    if (!sale) throw new SaleNotFoundException(dto.saleId);

    return this.prisma.inventorySaleDelivery.create({
      data: {
        tenantId,
        branchId,
        saleId: dto.saleId,
        reference: dto.reference ?? generateReference('DLV'),
        saleReferenceNo: dto.saleReferenceNo ?? sale.reference,
        customer: dto.customer ?? dto.deliveredTo,
        status: dto.status ?? 'PENDING',
        trackingNo: dto.trackingNo,
        deliveredTo: dto.deliveredTo ?? dto.customer,
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
        select: {
          id: true,
          reference: true,
          saleReferenceNo: true,
          customer: true,
          address: true,
          date: true,
          status: true,
        },
      });
      return [rows, await tx.inventorySaleDelivery.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  /** One delivery, loaded for the (plain) lookup write paths. */
  private async findOne(id: string, tenantId: string) {
    const delivery = await this.prisma.inventorySaleDelivery.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!delivery) throw new DeliveryNotFoundException(id);
    return delivery;
  }

  /**
   * One delivery enriched for the detail modal + PDF (EZHT `view_delivery` /
   * `pdf_delivery`): the delivery fields, the originating sale's line items
   * (name/code/variant/quantity) and the created-by staff name. Lookups are
   * best-effort and degrade to `null`/`[]`.
   */
  async getDetail(id: string, tenantId: string) {
    const delivery = await this.findOne(id, tenantId);
    const [items, createdByName] = await Promise.all([
      this.prisma.inventorySaleItem.findMany({
        where: { saleId: delivery.saleId, tenantId },
        select: {
          id: true,
          productName: true,
          productCode: true,
          quantity: true,
          serialNo: true,
          expiryDate: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      resolveUserName(this.usersClient, delivery.createdBy),
    ]);
    return { ...delivery, items, createdByName };
  }

  async update(id: string, tenantId: string, dto: UpdateDeliveryDto) {
    await this.findOne(id, tenantId);
    return this.prisma.inventorySaleDelivery.update({
      where: { id },
      data: {
        reference: dto.reference,
        saleReferenceNo: dto.saleReferenceNo,
        customer: dto.customer,
        deliveredTo: dto.customer,
        address: dto.address,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
    });
  }

  /** Soft-delete a delivery (it is a document — no stock impact). */
  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.inventorySaleDelivery.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    await this.findOne(id, tenantId);
    return this.prisma.inventorySaleDelivery.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /**
   * Render the delivery note PDF through kalnostics' print-template engine (the
   * same path as the sales invoice): kalnostics resolves whichever
   * `inventory_delivery` template the tenant mapped on its Configuration screen.
   * @returns the rendered PDF buffer + the DO reference (for the filename)
   */
  async renderDeliveryPdf(
    id: string,
    tenantId: string,
  ): Promise<{ pdf: Buffer; reference: string }> {
    const delivery = await this.getDetail(id, tenantId);

    const variables: Record<string, unknown> = {
      delivery_date: delivery.date.toISOString().slice(0, 16).replace('T', ' '),
      do_reference_no: delivery.reference,
      sale_reference_no: delivery.saleReferenceNo ?? '',
      customer: delivery.customer ?? '',
      address: delivery.address ?? '',
      note: delivery.note ?? '',
      prepared_by: delivery.createdByName ?? '',
    };

    const items = delivery.items.map((it, idx) => ({
      no: String(idx + 1),
      product_name: it.productName,
      product_code: it.productCode ?? '',
      description:
        it.productName + (it.productCode ? ` (${it.productCode})` : ''),
      quantity: new Prisma.Decimal(it.quantity).toFixed(2),
      serial_no: it.serialNo ?? '',
      expiry: it.expiryDate ? it.expiryDate.toISOString().slice(0, 10) : '',
    }));

    const pdf = await this.printTemplateClient.renderByType(
      'inventory_delivery',
      {
        variables,
        sections: { items },
      },
    );
    return { pdf, reference: delivery.reference };
  }
}
