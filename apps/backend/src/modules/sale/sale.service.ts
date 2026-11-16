import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { NumberingService } from '../settings/numbering.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { BranchRequiredException } from '../product/exceptions/product.exceptions';
import { CreateSaleDto, SalePaymentInputDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { CreateSalePaymentDto, UpdateSalePaymentDto } from './dto/payment.dto';
import { ImportSalesDto } from './dto/import-sales.dto';
import {
  SaleNotFoundException,
  SalePaymentExceedsBalanceException,
} from './exceptions/sale.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import {
  computeOrderTotals,
  derivePaymentStatus,
  type ComputedOrder,
} from '../../common/utils/order-totals.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** A line ready to persist, zipped from the DTO + computed money. */
type PersistedSaleLine = Prisma.InventorySaleItemCreateWithoutSaleInput & {
  productId: string;
  quantity: Prisma.Decimal;
};

/**
 * Sales — invoices to customers (CLAUDE.md §4.7). A COMPLETED sale removes stock
 * (outbound) at the active branch and snapshots the branch average cost as COGS.
 * Totals (per-line + order: discount %/fixed, tax incl/excl, GST split, order
 * discount/tax/shipping, grand total, paid/status) are computed server-side by
 * {@link computeOrderTotals}. Insufficient stock is rejected by ProductStockService.
 */
@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly numbering: NumberingService,
    private readonly branchClient: KalnosticsBranchClient,
  ) {}

  /**
   * Resolve the warehouse for a sale: a client-supplied `warehouseId` must
   * belong to the caller's tenant (validated via kalnostics), otherwise the
   * active branch is used (CLAUDE.md §4.5 — never trust a raw client branchId).
   */
  private async resolveWarehouse(
    branchId: string | null,
    warehouseId?: string,
  ): Promise<string> {
    if (warehouseId && warehouseId !== branchId) {
      await this.branchClient.findById(warehouseId);
      return warehouseId;
    }
    if (!branchId) throw new BranchRequiredException();
    return branchId;
  }

  /**
   * Resolve + snapshot each product and compute the full money breakdown.
   * Returns persist-ready line rows plus the order totals.
   */
  private async buildSaleLines(
    tenantId: string,
    branchId: string,
    dto: CreateSaleDto,
  ): Promise<{ lines: PersistedSaleLine[]; totals: ComputedOrder }> {
    const resolved = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const stock = await this.prisma.inventoryWarehouseProduct.findUnique({
          where: { productId_branchId: { productId: product.id, branchId } },
          select: { avgCost: true },
        });
        return {
          item,
          product,
          cost: stock?.avgCost ?? D(product.cost),
        };
      }),
    );

    const totals = computeOrderTotals({
      lines: resolved.map(({ item }) => ({
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discount,
        taxRatePercent: item.taxRate ?? 0,
        taxInclusive: item.taxInclusive ?? false,
      })),
      orderDiscount: dto.orderDiscount,
      orderTaxPercent: dto.orderTax ?? 0,
      shipping: dto.shipping ?? 0,
      interState: dto.interState ?? false,
    });

    const lines: PersistedSaleLine[] = resolved.map(
      ({ item, product, cost }, i) => {
        const c = totals.lines[i]!;
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          optionId: item.optionId,
          quantity: c.quantity,
          price: D(item.price),
          realUnitPrice: c.realUnitPrice,
          netUnitPrice: c.netUnitPrice,
          cost,
          taxRate: D(item.taxRate ?? 0),
          taxAmount: c.taxAmount,
          taxMethod: item.taxInclusive ? '1' : '0',
          discount: c.discount,
          discountSpec: item.discount,
          subtotal: c.subtotal,
          hsnCode: item.hsnCode,
          serialNo: item.serialNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          packSize: item.packSize != null ? D(item.packSize) : null,
          packQuantity: item.packQuantity != null ? D(item.packQuantity) : null,
          igst: c.igst,
          cgst: c.cgst,
          sgst: c.sgst,
        };
      },
    );

    return { lines, totals };
  }

  /** Header money/meta columns shared by create + update. */
  private saleHeaderData(
    dto: CreateSaleDto,
    totals: ComputedOrder,
    date: Date,
  ) {
    const dueDate =
      dto.paymentTerm != null
        ? new Date(date.getTime() + dto.paymentTerm * 86_400_000)
        : null;
    return {
      billerId: dto.billerId,
      billerName: dto.billerName,
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      orderDiscount: totals.orderDiscount,
      orderDiscountSpec: dto.orderDiscount,
      orderTax: totals.orderTax,
      orderTaxId: dto.orderTaxId,
      orderTaxSpec: dto.orderTax != null ? String(dto.orderTax) : null,
      totalTax: totals.totalTax,
      shipping: totals.shipping,
      roundoff: totals.roundoff,
      grandTotal: totals.grandTotal,
      totalItems: Math.round(totals.totalItems.toNumber()),
      paymentTerm: dto.paymentTerm,
      dueDate,
      gstNumber: dto.gstNumber,
      gstState: dto.gstState,
      taxMethod: dto.interState ? 'igst' : 'cgst+sgst',
      igst: totals.igst,
      cgst: totals.cgst,
      sgst: totals.sgst,
      attachmentUrl: dto.attachmentUrl,
      quoteId: dto.quoteId,
      doctorName: dto.doctorName,
      note: dto.note,
      staffNote: dto.staffNote,
    };
  }

  /** Create a sale and (when COMPLETED) apply outbound stock atomically. */
  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateSaleDto,
    actorId?: string,
  ) {
    const warehouse = await this.resolveWarehouse(branchId, dto.warehouseId);
    await this.customerService.findById(dto.customerId, tenantId);

    const { lines, totals } = await this.buildSaleLines(
      tenantId,
      warehouse,
      dto,
    );
    const status = dto.status ?? 'COMPLETED';
    const date = dto.date ? new Date(dto.date) : new Date();
    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'sale'));

    const { paid, paymentStatus } = this.resolvePaymentPlan(
      dto.payment,
      totals.grandTotal,
    );

    return this.prisma.withTenant(tenantId, async (tx) => {
      const sale = await tx.inventorySale.create({
        data: {
          tenantId,
          branchId: warehouse,
          customerId: dto.customerId,
          reference,
          date,
          status,
          ...this.saleHeaderData(dto, totals, date),
          paid,
          paymentStatus,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });

      if (paid.gt(0)) {
        await tx.inventorySalePayment.create({
          data: this.paymentRow(tenantId, sale.id, paid, dto.payment, actorId),
        });
      }

      if (status === 'COMPLETED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: l.quantity.negated(),
          });
        }
        const points = Math.floor(totals.grandTotal.toNumber() / 100);
        if (points > 0) {
          await tx.inventoryCustomer.updateMany({
            where: { id: dto.customerId, tenantId },
            data: { loyaltyPoints: { increment: points } },
          });
        }
      }

      return sale;
    });
  }

  /** Resolve the paid amount + status from the embedded payment block. */
  private resolvePaymentPlan(
    payment: SalePaymentInputDto | undefined,
    grandTotal: Prisma.Decimal,
  ): { paid: Prisma.Decimal; paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' } {
    const ps = payment?.paymentStatus?.toLowerCase();
    let paid = D(0);
    if (ps === 'paid') paid = grandTotal;
    else if (ps === 'partial') paid = D(payment?.amount ?? 0);
    return { paid, paymentStatus: derivePaymentStatus(paid, grandTotal) };
  }

  /** Build a sale-payment create row from an embedded payment block. */
  private paymentRow(
    tenantId: string,
    saleId: string,
    amount: Prisma.Decimal,
    payment: SalePaymentInputDto | undefined,
    actorId?: string,
  ): Prisma.InventorySalePaymentUncheckedCreateInput {
    return {
      tenantId,
      saleId,
      amount,
      method: (payment?.paidBy ?? 'CASH').toUpperCase(),
      reference: payment?.reference,
      date: new Date(),
      note: payment?.note,
      chequeNo: payment?.chequeNo,
      ccNo: payment?.ccNo,
      ccHolder: payment?.ccHolder,
      ccType: payment?.ccType,
      ccMonth: payment?.ccMonth,
      ccYear: payment?.ccYear,
      giftCardNo: payment?.giftCardNo,
      createdBy: actorId,
    };
  }

  /**
   * Bulk import sales (preview or commit). Each row is one full document; reuses
   * {@link create} so stock + COGS behave exactly like a manual sale.
   */
  async import(
    tenantId: string,
    branchId: string | null,
    dto: ImportSalesDto,
    actorId?: string,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateSaleDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.reference ?? row.customerId,
      validate: (row) => {
        if (!row.customerId) throw new Error('Missing customerId');
        if (!row.items?.length)
          throw new Error('At least one line item required');
      },
      create: (row) => this.create(tenantId, branchId, row, actorId),
    });
  }

  /** Paginated, filterable sale list. */
  async findAll(
    tenantId: string,
    query: SaleQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySaleWhereInput = { tenantId, deletedAt: null };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.customerId) where.customerId = query.customerId;
    if (query.warehouseId) where.branchId = query.warehouseId;
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.pos === 'true') where.posSessionId = { not: null };
    else if (query.pos === 'false') where.posSessionId = null;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySale.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventorySale.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  /** Fetch one sale with items, payments, and customer. */
  async findById(id: string, tenantId: string) {
    const sale = await this.prisma.inventorySale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
    if (!sale) throw new SaleNotFoundException(id);
    return sale;
  }

  /** Record a payment, update paid + payment status atomically. */
  async addPayment(
    id: string,
    tenantId: string,
    dto: CreateSalePaymentDto,
    actorId?: string,
  ) {
    const sale = await this.findById(id, tenantId);
    const amount = D(dto.amount);
    const outstanding = D(sale.grandTotal).sub(sale.paid);
    if (amount.gt(outstanding)) {
      throw new SalePaymentExceedsBalanceException(
        outstanding.toNumber(),
        amount.toNumber(),
      );
    }
    const newPaid = D(sale.paid).add(amount);
    const paymentStatus = derivePaymentStatus(newPaid, D(sale.grandTotal));

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySalePayment.create({
        data: {
          tenantId,
          saleId: id,
          amount,
          method: (dto.method ?? 'CASH').toUpperCase(),
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          chequeNo: dto.chequeNo,
          ccNo: dto.ccNo,
          ccHolder: dto.ccHolder,
          ccType: dto.ccType,
          ccMonth: dto.ccMonth,
          ccYear: dto.ccYear,
          giftCardNo: dto.giftCardNo,
          createdBy: actorId,
        },
      });
      return tx.inventorySale.update({
        where: { id },
        data: { paid: newPaid, paymentStatus },
        include: {
          payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        },
      });
    });
  }

  /**
   * Edit a sale (full line replacement). Re-syncs stock: reverses the old
   * outbound (if the sale was COMPLETED), swaps the items, and applies the new
   * outbound. Totals are recomputed; payments are preserved and payment status
   * is re-derived against the new grand total.
   */
  async update(
    id: string,
    tenantId: string,
    branchId: string | null,
    dto: CreateSaleDto,
  ) {
    const existing = await this.findById(id, tenantId);
    const warehouse = await this.resolveWarehouse(
      branchId,
      dto.warehouseId ?? existing.branchId,
    );
    await this.customerService.findById(dto.customerId, tenantId);

    const { lines, totals } = await this.buildSaleLines(
      tenantId,
      warehouse,
      dto,
    );
    const newStatus =
      dto.status ?? (existing.status as 'COMPLETED' | 'PENDING');
    const date = dto.date ? new Date(dto.date) : existing.date;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Reverse the previous outbound movement if the sale had removed stock.
      if (existing.status === 'COMPLETED') {
        for (const l of existing.items) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: existing.branchId,
            productId: l.productId,
            delta: D(l.quantity),
          });
        }
      }
      // 2. Replace line items.
      await tx.inventorySaleItem.deleteMany({ where: { saleId: id } });
      // 3. Apply the new outbound movement if the edited sale is COMPLETED.
      if (newStatus === 'COMPLETED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: l.quantity.negated(),
          });
        }
      }
      const paid = D(existing.paid);
      const paymentStatus = derivePaymentStatus(paid, totals.grandTotal);
      return tx.inventorySale.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          branchId: warehouse,
          date,
          status: newStatus,
          ...this.saleHeaderData(dto, totals, date),
          paymentStatus,
          items: { create: lines },
        },
        include: { items: true, payments: { where: { deletedAt: null } } },
      });
    });
  }

  /** Edit a payment, then recompute paid + status from live payments. */
  async editPayment(
    id: string,
    paymentId: string,
    tenantId: string,
    dto: UpdateSalePaymentDto,
  ) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventorySalePayment.findFirst({
      where: { id: paymentId, saleId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new SaleNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySalePayment.update({
        where: { id: paymentId },
        data: {
          amount: dto.amount != null ? D(dto.amount) : undefined,
          method: dto.method ? dto.method.toUpperCase() : undefined,
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : undefined,
          note: dto.note,
          chequeNo: dto.chequeNo,
          ccNo: dto.ccNo,
          ccHolder: dto.ccHolder,
          ccType: dto.ccType,
          ccMonth: dto.ccMonth,
          ccYear: dto.ccYear,
          giftCardNo: dto.giftCardNo,
        },
      });
      return this.recomputePaid(tx, id);
    });
  }

  /** Soft-delete a payment, then recompute paid + status. */
  async deletePayment(id: string, paymentId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventorySalePayment.findFirst({
      where: { id: paymentId, saleId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new SaleNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySalePayment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
      return this.recomputePaid(tx, id);
    });
  }

  private async recomputePaid(tx: Prisma.TransactionClient, id: string) {
    const agg = await tx.inventorySalePayment.aggregate({
      where: { saleId: id, deletedAt: null },
      _sum: { amount: true },
    });
    const sale = await tx.inventorySale.findUniqueOrThrow({
      where: { id },
      select: { grandTotal: true },
    });
    const paid = agg._sum.amount ?? D(0);
    const paymentStatus = derivePaymentStatus(paid, D(sale.grandTotal));
    return tx.inventorySale.update({
      where: { id },
      data: { paid, paymentStatus },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
  }

  /** Soft-delete a sale (does not restore stock — a return does that). */
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventorySale.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
