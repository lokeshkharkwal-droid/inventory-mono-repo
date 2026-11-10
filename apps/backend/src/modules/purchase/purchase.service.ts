import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { SupplierService } from '../supplier/supplier.service';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { NumberingService } from '../settings/numbering.service';
import { BranchRequiredException } from '../product/exceptions/product.exceptions';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import {
  CreatePurchasePaymentDto,
  UpdatePurchasePaymentDto,
  CreatePurchaseExpenseDto,
} from './dto/payment.dto';
import { ImportPurchasesDto } from './dto/import-purchases.dto';
import {
  PaymentExceedsBalanceException,
  PurchaseNotFoundException,
} from './exceptions/purchase.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Purchases — goods receipts from suppliers (CLAUDE.md §4.7). Creating a
 * RECEIVED purchase adds stock (inbound, AVCO) at the active branch via
 * ProductStockService. Totals are computed server-side from the line items.
 */
@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly numbering: NumberingService,
  ) {}

  /** Create a purchase and (when RECEIVED) apply inbound stock atomically. */
  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreatePurchaseDto,
    actorId?: string,
  ) {
    if (!branchId) throw new BranchRequiredException();
    await this.supplierService.findById(dto.supplierId, tenantId);

    // Resolve + snapshot each product; compute line money.
    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const cost = D(item.cost);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(cost).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          cost,
          taxRate,
          taxAmount,
          discount,
          subtotal: lineSubtotal,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        };
      }),
    );

    const subtotal = lines.reduce((s, l) => s.add(l.subtotal), D(0));
    const orderTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const shipping = D(dto.shipping ?? 0);
    const grandTotal = subtotal.add(orderTax).add(shipping).sub(orderDiscount);
    const status = dto.status ?? 'RECEIVED';
    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'purchase'));

    return this.prisma.withTenant(tenantId, async (tx) => {
      const purchase = await tx.inventoryPurchase.create({
        data: {
          tenantId,
          branchId,
          supplierId: dto.supplierId,
          reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          status,
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
          paid: D(0),
          paymentStatus: 'PENDING',
          note: dto.note,
          isBloodDonation: dto.isBloodDonation ?? false,
          donorName: dto.donorName,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });

      // Apply inbound stock only when the goods are received.
      if (status === 'RECEIVED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId,
            productId: l.productId,
            delta: l.quantity,
            cost: l.cost,
          });
          if (l.batchNo || l.expiryDate) {
            await tx.inventoryProductBatch.create({
              data: {
                tenantId,
                branchId,
                productId: l.productId,
                batchNo: l.batchNo,
                expiryDate: l.expiryDate,
                quantity: l.quantity,
                cost: l.cost,
              },
            });
          }
        }
      }

      return purchase;
    });
  }

  /**
   * Bulk import purchases (preview or commit). Each row is one full document;
   * reuses {@link create} so stock + totals behave exactly like a manual entry.
   */
  async import(
    tenantId: string,
    branchId: string | null,
    dto: ImportPurchasesDto,
    actorId?: string,
  ): Promise<ImportSummary> {
    return runBulkImport<CreatePurchaseDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.reference ?? row.supplierId,
      validate: (row) => {
        if (!row.supplierId) throw new Error('Missing supplierId');
        if (!row.items?.length)
          throw new Error('At least one line item required');
      },
      create: (row) => this.create(tenantId, branchId, row, actorId),
    });
  }

  /** Paginated, filterable purchase list. */
  async findAll(
    tenantId: string,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryPurchase.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryPurchase.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  /** Fetch one purchase with items, payments, and supplier. */
  async findById(id: string, tenantId: string) {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
    if (!purchase) throw new PurchaseNotFoundException(id);
    return purchase;
  }

  /** Record a payment, update paid + payment status atomically. */
  async addPayment(
    id: string,
    tenantId: string,
    dto: CreatePurchasePaymentDto,
    actorId?: string,
  ) {
    const purchase = await this.findById(id, tenantId);
    const amount = D(dto.amount);
    const outstanding = D(purchase.grandTotal).sub(purchase.paid);
    if (amount.gt(outstanding)) {
      throw new PaymentExceedsBalanceException(
        outstanding.toNumber(),
        amount.toNumber(),
      );
    }
    const newPaid = D(purchase.paid).add(amount);
    const paymentStatus = newPaid.gte(purchase.grandTotal)
      ? 'PAID'
      : newPaid.gt(0)
        ? 'PARTIAL'
        : 'PENDING';

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.create({
        data: {
          tenantId,
          purchaseId: id,
          amount,
          method: dto.method ?? 'CASH',
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          createdBy: actorId,
        },
      });
      return tx.inventoryPurchase.update({
        where: { id },
        data: { paid: newPaid, paymentStatus },
        include: {
          payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        },
      });
    });
  }

  /** Edit an existing payment, then recompute paid + status from live payments. */
  async editPayment(
    id: string,
    paymentId: string,
    tenantId: string,
    dto: UpdatePurchasePaymentDto,
  ) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventoryPurchasePayment.findFirst({
      where: { id: paymentId, purchaseId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new PurchaseNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.update({
        where: { id: paymentId },
        data: {
          amount: dto.amount != null ? D(dto.amount) : undefined,
          method: dto.method,
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : undefined,
          note: dto.note,
        },
      });
      return this.recomputePaid(tx, id);
    });
  }

  /** Soft-delete a payment, then recompute paid + status. */
  async deletePayment(id: string, paymentId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventoryPurchasePayment.findFirst({
      where: { id: paymentId, purchaseId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new PurchaseNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
      return this.recomputePaid(tx, id);
    });
  }

  /** Recompute `paid` + `paymentStatus` from the purchase's live payments. */
  private async recomputePaid(tx: Prisma.TransactionClient, id: string) {
    const agg = await tx.inventoryPurchasePayment.aggregate({
      where: { purchaseId: id, deletedAt: null },
      _sum: { amount: true },
    });
    const purchase = await tx.inventoryPurchase.findUniqueOrThrow({
      where: { id },
      select: { grandTotal: true },
    });
    const paid = agg._sum.amount ?? D(0);
    const paymentStatus = paid.gte(purchase.grandTotal)
      ? 'PAID'
      : paid.gt(0)
        ? 'PARTIAL'
        : 'PENDING';
    return tx.inventoryPurchase.update({
      where: { id },
      data: { paid, paymentStatus },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
  }

  // ── Expenses (freight / insurance / misc) ──────────────────────────────────────
  async addExpense(
    id: string,
    tenantId: string,
    dto: CreatePurchaseExpenseDto,
    actorId?: string,
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryPurchaseExpense.create({
      data: {
        tenantId,
        purchaseId: id,
        category: dto.category,
        amount: D(dto.amount),
        reference: dto.reference,
        note: dto.note,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actorId,
      },
    });
  }

  async listExpenses(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    const expenses = await this.prisma.inventoryPurchaseExpense.findMany({
      where: { purchaseId: id, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    const total = expenses.reduce((s, e) => s.add(e.amount), D(0));
    return { expenses, total };
  }

  /** Soft-delete a purchase (does not reverse stock — a return does that). */
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryPurchase.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
