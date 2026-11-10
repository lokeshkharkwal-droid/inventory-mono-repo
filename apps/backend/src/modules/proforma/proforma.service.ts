import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import {
  CreateProformaDto,
  ProformaQueryDto,
  UpdateProformaStatusDto,
} from './dto/proforma.dto';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — proforma not found (or soft-deleted) in this tenant. */
export class ProformaNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PROFORMA_NOT_FOUND',
      'Proforma not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Proforma invoices — pre-invoice documents (no stock movement). Product lines
 * plus optional lab/radiology lines (stored as JSON). Totals include both.
 */
@Injectable()
export class ProformaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateProformaDto,
    actorId?: string,
  ) {
    if (dto.customerId) {
      await this.customerService.findById(dto.customerId, tenantId);
    }

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const unitPrice = D(item.unitPrice);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(unitPrice).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          unitPrice,
          taxRate,
          taxAmount,
          discount,
          subtotal: lineSubtotal,
        };
      }),
    );

    const labTotal = (dto.labTests ?? []).reduce(
      (s, t) => s.add(D(t.price)),
      D(0),
    );
    const subtotal = lines
      .reduce((s, l) => s.add(l.subtotal), D(0))
      .add(labTotal);
    const orderTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const shipping = D(dto.shipping ?? 0);
    const grandTotal = subtotal.add(orderTax).add(shipping).sub(orderDiscount);

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryProforma.create({
        data: {
          tenantId,
          branchId,
          customerId: dto.customerId,
          reference: dto.reference ?? generateReference('PF'),
          date: dto.date ? new Date(dto.date) : new Date(),
          status: 'DRAFT',
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
          labTests: dto.labTests
            ? (dto.labTests as unknown as Prisma.InputJsonValue)
            : undefined,
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      }),
    );
  }

  async findAll(
    tenantId: string,
    query: ProformaQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryProformaWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryProforma.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryProforma.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const proforma = await this.prisma.inventoryProforma.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!proforma) throw new ProformaNotFoundException(id);
    return proforma;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateProformaStatusDto,
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProforma.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProforma.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
