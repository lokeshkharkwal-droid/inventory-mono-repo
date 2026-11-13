import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { SupplierService } from '../supplier/supplier.service';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { NumberingService } from '../settings/numbering.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { BranchRequiredException } from '../product/exceptions/product.exceptions';
import {
  CreatePurchaseDto,
  PurchasePaymentInputDto,
} from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import {
  CreatePurchasePaymentDto,
  UpdatePurchasePaymentDto,
  CreatePurchaseExpenseDto,
  SupplierBulkPaymentDto,
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
import {
  computeOrderTotals,
  derivePaymentStatus,
  type ComputedOrder,
} from '../../common/utils/order-totals.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

type PersistedPurchaseLine =
  Prisma.InventoryPurchaseItemCreateWithoutPurchaseInput & {
    productId: string;
    quantity: Prisma.Decimal;
    cost: Prisma.Decimal;
    batchNo?: string | null;
    expiryDate?: Date | null;
  };

/**
 * Purchases — goods receipts from suppliers (CLAUDE.md §4.7). Creating a
 * RECEIVED purchase adds stock (inbound, AVCO) at the active branch. Totals are
 * computed server-side by {@link computeOrderTotals} (discount %/fixed, tax
 * incl/excl, GST split, order discount/tax/shipping, grand total, paid/status).
 */
@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly numbering: NumberingService,
    private readonly branchClient: KalnosticsBranchClient,
  ) {}

  /** Validate a client-supplied warehouse against the tenant, else active branch. */
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

  /** Resolve + snapshot products and compute the money breakdown. */
  private async buildPurchaseLines(
    tenantId: string,
    dto: CreatePurchaseDto,
  ): Promise<{ lines: PersistedPurchaseLine[]; totals: ComputedOrder }> {
    const resolved = await Promise.all(
      dto.items.map(async (item) => ({
        item,
        product: await this.productService.findById(item.productId, tenantId),
      })),
    );

    const totals = computeOrderTotals({
      lines: resolved.map(({ item }) => ({
        quantity: item.quantity,
        unitPrice: item.cost,
        discount: item.discount,
        taxRatePercent: item.taxRate ?? 0,
        taxInclusive: item.taxInclusive ?? false,
      })),
      orderDiscount: dto.orderDiscount,
      orderTaxPercent: dto.orderTax ?? 0,
      shipping: dto.shipping ?? 0,
      interState: dto.interState ?? false,
    });

    const lines: PersistedPurchaseLine[] = resolved.map(
      ({ item, product }, i) => {
        const c = totals.lines[i]!;
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          optionId: item.optionId,
          quantity: c.quantity,
          cost: D(item.cost),
          realUnitCost: c.realUnitPrice,
          netUnitCost: c.netUnitPrice,
          mrp: item.mrp != null ? D(item.mrp) : null,
          taxRate: D(item.taxRate ?? 0),
          taxAmount: c.taxAmount,
          taxMethod: item.taxInclusive ? '1' : '0',
          discount: c.discount,
          discountSpec: item.discount,
          subtotal: c.subtotal,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          hsnCode: item.hsnCode,
          partNo: item.partNo,
          packSize: item.packSize != null ? D(item.packSize) : null,
          packQuantity: item.packQuantity != null ? D(item.packQuantity) : null,
          freePackQuantity:
            item.freePackQuantity != null ? D(item.freePackQuantity) : null,
          igst: c.igst,
          cgst: c.cgst,
          sgst: c.sgst,
        };
      },
    );

    return { lines, totals };
  }

  /** Header money/meta columns shared by create + update. */
  private purchaseHeaderData(
    dto: CreatePurchaseDto,
    totals: ComputedOrder,
    date: Date,
  ) {
    const dueDate =
      dto.paymentTerm != null
        ? new Date(date.getTime() + dto.paymentTerm * 86_400_000)
        : null;
    return {
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
      note: dto.note,
      isBloodDonation: dto.isBloodDonation ?? false,
      donorName: dto.donorName,
    };
  }

  /** Create a purchase and (when RECEIVED) apply inbound stock atomically. */
  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreatePurchaseDto,
    actorId?: string,
  ) {
    const warehouse = await this.resolveWarehouse(branchId, dto.warehouseId);
    await this.supplierService.findById(dto.supplierId, tenantId);

    const { lines, totals } = await this.buildPurchaseLines(tenantId, dto);
    const status = dto.status ?? 'RECEIVED';
    const date = dto.date ? new Date(dto.date) : new Date();
    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'purchase'));
    const { paid, paymentStatus } = this.resolvePaymentPlan(
      dto.payment,
      totals.grandTotal,
    );

    return this.prisma.withTenant(tenantId, async (tx) => {
      const purchase = await tx.inventoryPurchase.create({
        data: {
          tenantId,
          branchId: warehouse,
          supplierId: dto.supplierId,
          reference,
          date,
          status,
          ...this.purchaseHeaderData(dto, totals, date),
          paid,
          paymentStatus,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });

      if (paid.gt(0)) {
        await tx.inventoryPurchasePayment.create({
          data: this.paymentRow(
            tenantId,
            purchase.id,
            paid,
            dto.payment,
            actorId,
          ),
        });
      }

      // Apply inbound stock only when the goods are received.
      if (status === 'RECEIVED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: l.quantity,
            cost: l.cost,
          });
          if (l.batchNo || l.expiryDate) {
            await tx.inventoryProductBatch.create({
              data: {
                tenantId,
                branchId: warehouse,
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

  private resolvePaymentPlan(
    payment: PurchasePaymentInputDto | undefined,
    grandTotal: Prisma.Decimal,
  ): { paid: Prisma.Decimal; paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' } {
    const ps = payment?.paymentStatus?.toLowerCase();
    let paid = D(0);
    if (ps === 'paid') paid = grandTotal;
    else if (ps === 'partial') paid = D(payment?.amount ?? 0);
    return { paid, paymentStatus: derivePaymentStatus(paid, grandTotal) };
  }

  private paymentRow(
    tenantId: string,
    purchaseId: string,
    amount: Prisma.Decimal,
    payment: PurchasePaymentInputDto | undefined,
    actorId?: string,
  ): Prisma.InventoryPurchasePaymentUncheckedCreateInput {
    return {
      tenantId,
      purchaseId,
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
      createdBy: actorId,
    };
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
    if (query.warehouseId) where.branchId = query.warehouseId;
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

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

  /**
   * Edit a purchase (full line replacement). Re-syncs stock: reverses the old
   * inbound (if RECEIVED), swaps items, and applies the new inbound. Totals
   * recomputed; payments preserved, status re-derived. Requires an `editNote`.
   */
  async update(
    id: string,
    tenantId: string,
    branchId: string | null,
    dto: CreatePurchaseDto,
  ) {
    const existing = await this.findById(id, tenantId);
    const warehouse = await this.resolveWarehouse(
      branchId,
      dto.warehouseId ?? existing.branchId,
    );
    await this.supplierService.findById(dto.supplierId, tenantId);

    const { lines, totals } = await this.buildPurchaseLines(tenantId, dto);
    const newStatus =
      dto.status ?? (existing.status as 'RECEIVED' | 'ORDERED' | 'PENDING');
    const date = dto.date ? new Date(dto.date) : existing.date;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Reverse previous inbound if the purchase had added stock.
      if (existing.status === 'RECEIVED') {
        for (const l of existing.items) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: existing.branchId,
            productId: l.productId,
            delta: D(l.quantity).negated(),
          });
        }
      }
      // 2. Replace line items.
      await tx.inventoryPurchaseItem.deleteMany({ where: { purchaseId: id } });
      // 3. Apply new inbound if the edited purchase is RECEIVED.
      if (newStatus === 'RECEIVED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: l.quantity,
            cost: l.cost,
          });
        }
      }
      const paid = D(existing.paid);
      const paymentStatus = derivePaymentStatus(paid, totals.grandTotal);
      return tx.inventoryPurchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          branchId: warehouse,
          date,
          status: newStatus,
          ...this.purchaseHeaderData(dto, totals, date),
          editNote: dto.editNote,
          isEdited: true,
          paymentStatus,
          items: { create: lines },
        },
        include: { items: true, payments: { where: { deletedAt: null } } },
      });
    });
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
    const paymentStatus = derivePaymentStatus(newPaid, D(purchase.grandTotal));

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.create({
        data: {
          tenantId,
          purchaseId: id,
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
    const paymentStatus = derivePaymentStatus(paid, D(purchase.grandTotal));
    return tx.inventoryPurchase.update({
      where: { id },
      data: { paid, paymentStatus },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
  }

  // ── Supplier payments (legacy Purchases::supplier_payments) ───────────────────

  /** List a supplier's purchases that still have an outstanding balance. */
  async supplierOutstanding(supplierId: string, tenantId: string) {
    await this.supplierService.findById(supplierId, tenantId);
    const rows = await this.prisma.inventoryPurchase.findMany({
      where: {
        tenantId,
        supplierId,
        deletedAt: null,
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        status: { not: 'RETURNED' },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        reference: true,
        date: true,
        status: true,
        grandTotal: true,
        paid: true,
        paymentStatus: true,
      },
    });
    const purchases = rows.map((p) => ({
      ...p,
      balance: D(p.grandTotal).sub(p.paid),
    }));
    const totalDue = purchases.reduce((s, p) => s.add(p.balance), D(0));
    return { purchases, totalDue };
  }

  /**
   * Record one bulk supplier payment and allocate it across the supplier's
   * outstanding purchases (explicit allocations, or oldest-first otherwise).
   * Creates an {@link InventorySupplierPayment} header plus a per-purchase
   * {@link InventoryPurchasePayment} allocation, updating each purchase's
   * paid + payment status.
   */
  async addSupplierPayment(
    tenantId: string,
    dto: SupplierBulkPaymentDto,
    actorId?: string,
  ) {
    await this.supplierService.findById(dto.supplierId, tenantId);
    const { purchases } = await this.supplierOutstanding(
      dto.supplierId,
      tenantId,
    );
    const byId = new Map(purchases.map((p) => [p.id, p]));

    // Resolve allocations: explicit, or spread the amount oldest-first.
    const allocations: { purchaseId: string; amount: Prisma.Decimal }[] = [];
    if (dto.allocations?.length) {
      for (const a of dto.allocations) {
        const p = byId.get(a.purchaseId);
        if (!p) throw new PurchaseNotFoundException(a.purchaseId);
        const amount = Prisma.Decimal.min(D(a.amount), p.balance);
        if (amount.gt(0)) allocations.push({ purchaseId: p.id, amount });
      }
    } else {
      let remaining = D(dto.amount);
      for (const p of purchases) {
        if (remaining.lte(0)) break;
        const amount = Prisma.Decimal.min(remaining, p.balance);
        if (amount.gt(0)) {
          allocations.push({ purchaseId: p.id, amount });
          remaining = remaining.sub(amount);
        }
      }
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      const header = await tx.inventorySupplierPayment.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          amount: D(dto.amount),
          method: (dto.method ?? 'CASH').toUpperCase(),
          reference: dto.reference,
          note: dto.note,
          date: dto.date ? new Date(dto.date) : new Date(),
          createdBy: actorId,
        },
      });

      for (const a of allocations) {
        await tx.inventoryPurchasePayment.create({
          data: {
            tenantId,
            purchaseId: a.purchaseId,
            amount: a.amount,
            method: (dto.method ?? 'CASH').toUpperCase(),
            reference: dto.reference,
            date: header.date,
            note: dto.note,
            chequeNo: dto.chequeNo,
            supplierPaymentId: header.id,
            createdBy: actorId,
          },
        });
        await this.recomputePaid(tx, a.purchaseId);
      }

      return { ...header, allocations };
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
