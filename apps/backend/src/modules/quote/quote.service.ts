import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { generateReference } from '../../common/utils/reference.util';
import { CustomerService } from '../customer/customer.service';
import { SupplierService } from '../supplier/supplier.service';
import { ProductService } from '../product/product.service';
import { SaleService } from '../sale/sale.service';
import { PurchaseService } from '../purchase/purchase.service';
import {
  CreateQuoteDto,
  QuoteQueryDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';
import {
  QuoteNotConvertibleException,
  QuoteNotFoundException,
  QuotePartyRequiredException,
} from './exceptions/quote.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Quotations (sales or purchase). No stock movement; a SALE quote can be
 * converted into a sale (reusing SaleService). Totals are computed server-side.
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly saleService: SaleService,
    private readonly purchaseService: PurchaseService,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateQuoteDto,
    actorId?: string,
  ) {
    if (dto.type === 'SALE') {
      if (!dto.customerId) throw new QuotePartyRequiredException('SALE');
      await this.customerService.findById(dto.customerId, tenantId);
    } else {
      if (!dto.supplierId) throw new QuotePartyRequiredException('PURCHASE');
      await this.supplierService.findById(dto.supplierId, tenantId);
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

    const subtotal = lines.reduce((s, l) => s.add(l.subtotal), D(0));
    const orderTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const shipping = D(dto.shipping ?? 0);
    const grandTotal = subtotal.add(orderTax).add(shipping).sub(orderDiscount);

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryQuote.create({
        data: {
          tenantId,
          branchId,
          type: dto.type,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          reference: dto.reference ?? generateReference('QT'),
          date: dto.date ? new Date(dto.date) : new Date(),
          status: 'DRAFT',
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
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
    query: QuoteQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryQuoteWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryQuote.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryQuote.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const quote = await this.prisma.inventoryQuote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!quote) throw new QuoteNotFoundException(id);
    return quote;
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateQuoteStatusDto) {
    const quote = await this.findById(id, tenantId);
    if (quote.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException(
        'A converted quote cannot change status',
      );
    }
    return this.prisma.inventoryQuote.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });
  }

  /**
   * Convert a quote into its downstream document: a SALE quote becomes a sale,
   * a PURCHASE quote becomes a purchase order. Dispatches on the quote's type.
   */
  async convert(
    id: string,
    tenantId: string,
    branchId: string | null,
    actorId?: string,
  ) {
    const quote = await this.findById(id, tenantId);
    return quote.type === 'PURCHASE'
      ? this.convertToPurchase(id, tenantId, branchId, actorId)
      : this.convertToSale(id, tenantId, branchId, actorId);
  }

  /** Convert a SALE quote into a sale at the given branch (reuses SaleService). */
  async convertToSale(
    id: string,
    tenantId: string,
    branchId: string | null,
    actorId?: string,
  ) {
    const quote = await this.findById(id, tenantId);
    if (quote.type !== 'SALE') {
      throw new QuoteNotConvertibleException(
        'Only sales quotes convert to a sale',
      );
    }
    if (quote.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException('This quote is already converted');
    }
    if (!quote.customerId) throw new QuotePartyRequiredException('SALE');

    const sale = await this.saleService.create(
      tenantId,
      branchId,
      {
        customerId: quote.customerId,
        orderDiscount: quote.orderDiscount.toNumber(),
        shipping: quote.shipping.toNumber(),
        note: `From quote ${quote.reference}`,
        items: quote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity.toNumber(),
          price: i.unitPrice.toNumber(),
          taxRate: i.taxRate.toNumber(),
          discount: i.discount.toNumber(),
        })),
      },
      actorId,
    );

    await this.prisma.inventoryQuote.update({
      where: { id },
      data: { status: 'CONVERTED', convertedToId: sale.id },
    });
    return sale;
  }

  /**
   * Convert a PURCHASE quote into a purchase order at the given branch (reuses
   * PurchaseService). Created as ORDERED so it does not move stock until the
   * goods are actually received. The quote's unit prices are the line costs.
   */
  async convertToPurchase(
    id: string,
    tenantId: string,
    branchId: string | null,
    actorId?: string,
  ) {
    const quote = await this.findById(id, tenantId);
    if (quote.type !== 'PURCHASE') {
      throw new QuoteNotConvertibleException(
        'Only purchase quotes convert to a purchase',
      );
    }
    if (quote.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException('This quote is already converted');
    }
    if (!quote.supplierId) throw new QuotePartyRequiredException('PURCHASE');

    const purchase = await this.purchaseService.create(
      tenantId,
      branchId,
      {
        supplierId: quote.supplierId,
        status: 'ORDERED',
        orderDiscount: quote.orderDiscount.toNumber(),
        shipping: quote.shipping.toNumber(),
        note: `From quote ${quote.reference}`,
        items: quote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity.toNumber(),
          cost: i.unitPrice.toNumber(),
          taxRate: i.taxRate.toNumber(),
          discount: i.discount.toNumber(),
        })),
      },
      actorId,
    );

    await this.prisma.inventoryQuote.update({
      where: { id },
      data: { status: 'CONVERTED', convertedToId: purchase.id },
    });
    return purchase;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryQuote.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
