import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { generateReference } from '../../common/utils/reference.util';
import {
  computeOrderTotals,
  type ComputedOrder,
} from '../../common/utils/order-totals.util';
import {
  resolveWarehouseDetail,
  resolveUserName,
} from '../../common/utils/party-detail.util';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
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
  QuoteLineInvalidException,
  QuoteNotConvertibleException,
  QuoteNotFoundException,
  QuotePartyRequiredException,
} from './exceptions/quote.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** A quote line ready to persist, zipped from the DTO + computed money. */
type PersistedQuoteLine =
  Prisma.InventoryQuoteItemUncheckedCreateWithoutQuoteInput;

/**
 * Quotations (sales or purchase). No stock movement; a SALE quote can be
 * converted into a sale (reusing SaleService) and a PURCHASE quote into a
 * purchase order. Totals are computed server-side by the shared
 * {@link computeOrderTotals} money engine — the same one Sales/Purchases use —
 * so a quote's grand total matches the live form preview exactly, and `%`
 * discounts / order tax behave identically everywhere.
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
    private readonly branchClient: KalnosticsBranchClient,
    private readonly usersClient: KalnosticsUsersClient,
  ) {}

  /** Validate the party (customer for SALE, supplier for PURCHASE) exists. */
  private async assertParty(tenantId: string, dto: CreateQuoteDto) {
    if (dto.type === 'SALE') {
      if (!dto.customerId) throw new QuotePartyRequiredException('SALE');
      await this.customerService.findById(dto.customerId, tenantId);
    } else {
      if (!dto.supplierId) throw new QuotePartyRequiredException('PURCHASE');
      await this.supplierService.findById(dto.supplierId, tenantId);
    }
  }

  /**
   * Resolve product snapshots + run the shared money engine, returning the
   * persist-ready line rows and the aggregate order totals.
   */
  private async buildLines(
    tenantId: string,
    dto: CreateQuoteDto,
  ): Promise<{ lines: PersistedQuoteLine[]; totals: ComputedOrder }> {
    // Catalogue lines resolve a product snapshot; manual (off-catalogue) lines
    // carry their own name/code and have no productId (EZHT "add manual product").
    const products = await Promise.all(
      dto.items.map((i) =>
        i.productId
          ? this.productService.findById(i.productId, tenantId)
          : Promise.resolve(null),
      ),
    );
    const totals = computeOrderTotals({
      lines: dto.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRatePercent: i.taxRate ?? 0,
        taxInclusive: i.taxInclusive ?? false,
      })),
      orderDiscount: dto.orderDiscount,
      orderTaxPercent: dto.orderTax ?? 0,
      shipping: dto.shipping ?? 0,
      interState: dto.interState ?? false,
    });
    const lines: PersistedQuoteLine[] = dto.items.map((item, idx) => {
      const product = products[idx];
      const c = totals.lines[idx]!;
      const name = product?.name ?? item.productName?.trim();
      if (!name) throw new QuoteLineInvalidException();
      return {
        tenantId,
        productId: product?.id ?? null,
        productName: name,
        productCode: product?.code ?? item.productCode ?? null,
        serialNo: item.serialNo,
        quantity: c.quantity,
        unitPrice: c.realUnitPrice,
        netUnitPrice: c.netUnitPrice,
        taxRate: D(item.taxRate ?? 0),
        taxAmount: c.taxAmount,
        discount: c.discount,
        discountSpec: item.discount,
        subtotal: c.subtotal,
        packSize: item.packSize,
        packQuantity: item.packQuantity != null ? D(item.packQuantity) : null,
        productType: item.productType ?? (product ? undefined : 'manual'),
        optionId: item.optionId,
      };
    });
    return { lines, totals };
  }

  /** The header total columns, derived from the computed order. */
  private headerTotals(totals: ComputedOrder) {
    return {
      subtotal: totals.subtotal,
      orderTax: totals.orderTax,
      orderDiscount: totals.orderDiscount,
      productDiscount: totals.productDiscount,
      totalTax: totals.totalTax,
      totalItems: Math.round(totals.totalItems.toNumber()),
      shipping: totals.shipping,
      grandTotal: totals.grandTotal,
    };
  }

  /** Header fields that depend on raw DTO input (specs not derivable from totals). */
  private headerSpecs(dto: CreateQuoteDto) {
    return {
      orderDiscountSpec: dto.orderDiscount ?? null,
      orderTaxPercent: dto.orderTax != null ? D(dto.orderTax) : null,
    };
  }

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateQuoteDto,
    actorId?: string,
  ) {
    await this.assertParty(tenantId, dto);
    const { lines, totals } = await this.buildLines(tenantId, dto);
    const status = dto.status ?? 'DRAFT';

    return this.prisma.withTenant(tenantId, async (tx) => {
      const quote = await tx.inventoryQuote.create({
        data: {
          tenantId,
          branchId,
          type: dto.type,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          billerId: dto.billerId,
          warehouseId: dto.warehouseId,
          reference: dto.reference ?? generateReference('QU'),
          date: dto.date ? new Date(dto.date) : new Date(),
          status,
          ...this.headerTotals(totals),
          ...this.headerSpecs(dto),
          gstNumber: dto.gstNumber,
          gstState: dto.gstState,
          attachmentUrl: dto.attachmentUrl,
          referralInfo: dto.referral
            ? (dto.referral as unknown as Prisma.InputJsonValue)
            : undefined,
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });
      await tx.inventoryQuoteStatusHistory.create({
        data: {
          tenantId,
          quoteId: quote.id,
          status,
          comment: 'Quote created',
          createdBy: actorId ?? null,
        },
      });
      return quote;
    });
  }

  /**
   * Edit a quote's content (header + lines). A CONVERTED quote is locked — it
   * already spawned a sale/purchase. Line items are fully replaced (EZHT deletes
   * and re-inserts `quote_items` on edit).
   */
  async update(
    id: string,
    tenantId: string,
    _branchId: string | null,
    dto: CreateQuoteDto,
    actorId?: string,
  ) {
    const existing = await this.findById(id, tenantId);
    if (existing.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException(
        'A converted quote can no longer be edited',
      );
    }
    await this.assertParty(tenantId, dto);
    const { lines, totals } = await this.buildLines(tenantId, dto);

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryQuoteItem.deleteMany({ where: { quoteId: id } });
      const updated = await tx.inventoryQuote.update({
        where: { id },
        data: {
          type: dto.type,
          customerId: dto.customerId ?? null,
          supplierId: dto.supplierId ?? null,
          billerId: dto.billerId ?? null,
          warehouseId: dto.warehouseId ?? null,
          reference: dto.reference ?? existing.reference,
          date: dto.date ? new Date(dto.date) : existing.date,
          status: dto.status ?? existing.status,
          ...this.headerTotals(totals),
          ...this.headerSpecs(dto),
          gstNumber: dto.gstNumber ?? null,
          gstState: dto.gstState ?? null,
          attachmentUrl: dto.attachmentUrl ?? null,
          referralInfo: dto.referral
            ? (dto.referral as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          note: dto.note ?? null,
          items: { create: lines },
        },
        include: { items: true },
      });
      if (dto.status && dto.status !== existing.status) {
        await tx.inventoryQuoteStatusHistory.create({
          data: {
            tenantId,
            quoteId: id,
            status: dto.status,
            comment: 'Status changed on edit',
            createdBy: actorId ?? null,
          },
        });
      }
      return updated;
    });
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
    if (query.productId) where.items = { some: { productId: query.productId } };
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) {
        // Inclusive end-of-day.
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [rows, total] = await this.prisma.$transaction(async (tx) => {
      const data = await tx.inventoryQuote.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: { select: { productName: true, quantity: true } } },
      });
      const count = await tx.inventoryQuote.count({ where });
      return [data, count] as const;
    });

    const data = await this.enrichRows(tenantId, rows);
    return { data, total, page, limit };
  }

  /**
   * Attach customer/supplier/biller + source-branch names and the product-qty line
   * list to list rows (EZHT product-view quotations columns). Biller has no name
   * snapshot on the quote, so it is resolved from `InventoryBiller` by `billerId`.
   */
  private async enrichRows(
    tenantId: string,
    rows: Prisma.InventoryQuoteGetPayload<{
      include: { items: { select: { productName: true; quantity: true } } };
    }>[],
  ) {
    const customerIds = [
      ...new Set(rows.map((r) => r.customerId).filter(Boolean) as string[]),
    ];
    const supplierIds = [
      ...new Set(rows.map((r) => r.supplierId).filter(Boolean) as string[]),
    ];
    const billerIds = [
      ...new Set(rows.map((r) => r.billerId).filter(Boolean) as string[]),
    ];
    const branchIds = [
      ...new Set(rows.map((r) => r.branchId).filter(Boolean) as string[]),
    ];

    const [customers, suppliers, billers, branchEntries] = await Promise.all([
      customerIds.length
        ? this.prisma.inventoryCustomer.findMany({
            where: { tenantId, id: { in: customerIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      supplierIds.length
        ? this.prisma.inventorySupplier.findMany({
            where: { tenantId, id: { in: supplierIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      billerIds.length
        ? this.prisma.inventoryBiller.findMany({
            where: { tenantId, id: { in: billerIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      Promise.all(
        branchIds.map(
          async (bid) =>
            [
              bid,
              (await resolveWarehouseDetail(this.branchClient, bid))?.name ??
                null,
            ] as const,
        ),
      ),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const billerMap = new Map(billers.map((b) => [b.id, b.name]));
    const branchMap = new Map(branchEntries);

    return rows.map((r) => {
      const customerName = r.customerId
        ? (customerMap.get(r.customerId) ?? null)
        : null;
      const supplierName = r.supplierId
        ? (supplierMap.get(r.supplierId) ?? null)
        : null;
      const { items, ...rest } = r;
      return {
        ...rest,
        customerName,
        supplierName,
        billerName: r.billerId ? (billerMap.get(r.billerId) ?? null) : null,
        partyName: r.type === 'SALE' ? customerName : supplierName,
        sourceBranch: r.branchId ? (branchMap.get(r.branchId) ?? null) : null,
        products: items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
      };
    });
  }

  async findById(id: string, tenantId: string) {
    const quote = await this.prisma.inventoryQuote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!quote) throw new QuoteNotFoundException(id);
    return quote;
  }

  /** Full detail for the view page — party, source branch, creator, timeline. */
  async getDetail(id: string, tenantId: string) {
    const quote = await this.findById(id, tenantId);

    const partyPromise =
      quote.type === 'SALE' && quote.customerId
        ? this.customerService
            .findById(quote.customerId, tenantId)
            .catch(() => null)
        : quote.supplierId
          ? this.supplierService
              .findById(quote.supplierId, tenantId)
              .catch(() => null)
          : Promise.resolve(null);

    const [party, warehouse, createdByName, statusHistory] = await Promise.all([
      partyPromise,
      resolveWarehouseDetail(this.branchClient, quote.branchId),
      resolveUserName(this.usersClient, quote.createdBy),
      this.prisma.inventoryQuoteStatusHistory.findMany({
        where: { quoteId: id, tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { ...quote, party, warehouse, createdByName, statusHistory };
  }

  /**
   * Change a quote's status (approve/reject/send/complete) with an optional
   * comment, appending a row to the status-history trail (EZHT
   * `comments_history`). A CONVERTED quote is locked.
   */
  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateQuoteStatusDto,
    actorId?: string,
  ) {
    const quote = await this.findById(id, tenantId);
    if (quote.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException(
        'A converted quote cannot change status',
      );
    }
    const createdByName = await resolveUserName(
      this.usersClient,
      actorId ?? null,
    );
    return this.prisma.withTenant(tenantId, async (tx) => {
      const updated = await tx.inventoryQuote.update({
        where: { id },
        data: { status: dto.status },
        include: { items: true },
      });
      await tx.inventoryQuoteStatusHistory.create({
        data: {
          tenantId,
          quoteId: id,
          status: dto.status,
          comment: dto.comment ?? null,
          createdBy: actorId ?? null,
          createdByName,
        },
      });
      return updated;
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
        orderDiscount: String(quote.orderDiscount.toNumber()),
        shipping: quote.shipping.toNumber(),
        note: `From quote ${quote.reference}`,
        // Manual (off-catalogue) lines can't become catalogue sale lines — skip them.
        items: quote.items
          .filter((i) => i.productId)
          .map((i) => ({
            productId: i.productId!,
            quantity: i.quantity.toNumber(),
            price: i.unitPrice.toNumber(),
            taxRate: i.taxRate.toNumber(),
            discount: String(i.discount.toNumber()),
          })),
      },
      actorId,
    );

    await this.markConverted(id, tenantId, sale.id, actorId);
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
        orderDiscount: String(quote.orderDiscount.toNumber()),
        shipping: quote.shipping.toNumber(),
        note: `From quote ${quote.reference}`,
        // Manual (off-catalogue) lines can't become catalogue purchase lines — skip them.
        items: quote.items
          .filter((i) => i.productId)
          .map((i) => ({
            productId: i.productId!,
            quantity: i.quantity.toNumber(),
            cost: i.unitPrice.toNumber(),
            taxRate: i.taxRate.toNumber(),
            discount: String(i.discount.toNumber()),
          })),
      },
      actorId,
    );

    await this.markConverted(id, tenantId, purchase.id, actorId);
    return purchase;
  }

  /**
   * Mark a quote CONVERTED after a downstream sale/purchase was created from it
   * via the prefilled add-form (EZHT "Create Invoice/Purchase" flow). Idempotent-
   * guarded: a quote already converted is rejected.
   */
  async markConvertedTo(
    id: string,
    tenantId: string,
    convertedToId: string,
    actorId?: string,
  ) {
    const quote = await this.findById(id, tenantId);
    if (quote.status === 'CONVERTED') {
      throw new QuoteNotConvertibleException('This quote is already converted');
    }
    await this.markConverted(id, tenantId, convertedToId, actorId);
    return this.findById(id, tenantId);
  }

  /** Mark a quote CONVERTED, link the downstream doc and log the transition. */
  private async markConverted(
    id: string,
    tenantId: string,
    convertedToId: string,
    actorId?: string,
  ) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryQuote.update({
        where: { id },
        data: { status: 'CONVERTED', convertedToId },
      });
      await tx.inventoryQuoteStatusHistory.create({
        data: {
          tenantId,
          quoteId: id,
          status: 'CONVERTED',
          comment: `Converted to ${convertedToId}`,
          createdBy: actorId ?? null,
        },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryQuote.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  /** Soft-delete many quotes at once (EZHT bulk "Delete" action). */
  async removeMany(ids: string[], tenantId: string) {
    const result = await this.prisma.inventoryQuote.updateMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { deleted: result.count };
  }
}
