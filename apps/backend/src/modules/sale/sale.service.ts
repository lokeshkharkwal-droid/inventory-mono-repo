import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { NumberingService } from '../settings/numbering.service';
import { BranchRequiredException } from '../product/exceptions/product.exceptions';
import { CreateSaleDto } from './dto/create-sale.dto';
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

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Sales — invoices to customers (CLAUDE.md §4.7). A COMPLETED sale removes stock
 * (outbound) at the active branch and snapshots the branch average cost as COGS.
 * Insufficient stock is rejected by ProductStockService.applyDelta.
 */
@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly numbering: NumberingService,
  ) {}

  /** Create a sale and (when COMPLETED) apply outbound stock atomically. */
  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateSaleDto,
    actorId?: string,
  ) {
    if (!branchId) throw new BranchRequiredException();
    await this.customerService.findById(dto.customerId, tenantId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const stock = await this.prisma.inventoryWarehouseProduct.findUnique({
          where: { productId_branchId: { productId: product.id, branchId } },
          select: { avgCost: true },
        });
        const cost = stock?.avgCost ?? D(product.cost);
        const qty = D(item.quantity);
        const price = D(item.price);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(price).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          price,
          cost,
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
    const status = dto.status ?? 'COMPLETED';
    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'sale'));

    return this.prisma.withTenant(tenantId, async (tx) => {
      const sale = await tx.inventorySale.create({
        data: {
          tenantId,
          branchId,
          customerId: dto.customerId,
          billerName: dto.billerName,
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
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });

      if (status === 'COMPLETED') {
        for (const l of lines) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId,
            productId: l.productId,
            delta: l.quantity.negated(),
          });
        }
        // Award loyalty points (1 point per 100 of grand total) — legacy award_points.
        const points = Math.floor(grandTotal.toNumber() / 100);
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
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

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
    const paymentStatus = newPaid.gte(sale.grandTotal)
      ? 'PAID'
      : newPaid.gt(0)
        ? 'PARTIAL'
        : 'PENDING';

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySalePayment.create({
        data: {
          tenantId,
          saleId: id,
          amount,
          method: dto.method ?? 'CASH',
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
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
   * outbound. Totals + payment status are recomputed; payments are preserved.
   */
  async update(
    id: string,
    tenantId: string,
    branchId: string | null,
    dto: CreateSaleDto,
  ) {
    if (!branchId) throw new BranchRequiredException();
    const existing = await this.findById(id, tenantId);
    await this.customerService.findById(dto.customerId, tenantId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const stock = await this.prisma.inventoryWarehouseProduct.findUnique({
          where: { productId_branchId: { productId: product.id, branchId } },
          select: { avgCost: true },
        });
        const cost = stock?.avgCost ?? D(product.cost);
        const qty = D(item.quantity);
        const price = D(item.price);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(price).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          price,
          cost,
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
    const newStatus = dto.status ?? existing.status;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Reverse the previous outbound movement if the sale had removed stock.
      if (existing.status === 'COMPLETED') {
        for (const l of existing.items) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId,
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
            branchId,
            productId: l.productId,
            delta: l.quantity.negated(),
          });
        }
      }
      const paid = D(existing.paid);
      const paymentStatus = paid.gte(grandTotal)
        ? 'PAID'
        : paid.gt(0)
          ? 'PARTIAL'
          : 'PENDING';
      return tx.inventorySale.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          billerName: dto.billerName,
          date: dto.date ? new Date(dto.date) : existing.date,
          status: newStatus,
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
          paymentStatus,
          note: dto.note,
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
    const paymentStatus = paid.gte(sale.grandTotal)
      ? 'PAID'
      : paid.gt(0)
        ? 'PARTIAL'
        : 'PENDING';
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
