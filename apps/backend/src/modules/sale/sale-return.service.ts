import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { derivePaymentStatus } from '../../common/utils/order-totals.util';
import {
  resolveWarehouseDetail,
  resolveUserName,
} from '../../common/utils/party-detail.util';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
import { KalnosticsPrintTemplateClient } from '../../integration/clients/kalnostics-print-template.client';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { SettingsService } from '../settings/settings.service';
import { CreateSaleReturnDto, SaleReturnQueryDto } from './dto/sale-return.dto';
import { CreateSalePaymentDto, UpdateSalePaymentDto } from './dto/payment.dto';
import {
  SaleNotFoundException,
  SalePaymentExceedsBalanceException,
  SaleReturnPaymentBlockedException,
} from './exceptions/sale.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — sale return not found. */
export class SaleReturnNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'SALE_RETURN_NOT_FOUND',
      'Sale return not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Sale returns — goods returned by the customer. Restocks (inbound) at the
 * original sale's branch; the avg cost is left unchanged (no cost on restock).
 * EZHT parity: carries a full return header (customer/sale-reference snapshots,
 * surcharge, grand total) and a payment ledger (add/view/edit/delete, with the
 * "fully-paid return cannot take a payment" guard), plus a detail view and PDF.
 */
@Injectable()
export class SaleReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly settingsService: SettingsService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly usersClient: KalnosticsUsersClient,
    private readonly printTemplateClient: KalnosticsPrintTemplateClient,
  ) {}

  async create(tenantId: string, dto: CreateSaleReturnDto, actorId?: string) {
    const sale = await this.prisma.inventorySale.findFirst({
      where: { id: dto.saleId, tenantId, deletedAt: null },
      select: {
        id: true,
        branchId: true,
        reference: true,
        customer: { select: { name: true } },
      },
    });
    if (!sale) throw new SaleNotFoundException(dto.saleId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const price = D(item.price);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          price,
          subtotal: qty.mul(price),
          serialNo: item.serialNo ?? null,
        };
      }),
    );
    const total = lines.reduce((s, l) => s.add(l.subtotal), D(0));
    const surcharge = D(dto.surcharge ?? 0);
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const totalTax = D(0);
    // EZHT: grand_total = total + total_tax − surcharge − order_discount.
    const grandTotal = total.add(totalTax).sub(surcharge).sub(orderDiscount);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const ret = await tx.inventorySaleReturn.create({
        data: {
          tenantId,
          branchId: sale.branchId,
          saleId: sale.id,
          reference: dto.reference ?? generateReference('SRET'),
          saleReference: sale.reference,
          customer: sale.customer?.name ?? null,
          date: dto.date ? new Date(dto.date) : new Date(),
          total,
          surcharge,
          orderDiscount,
          totalTax,
          grandTotal,
          refundAmount: D(dto.refundAmount ?? 0),
          paid: D(0),
          paymentStatus: derivePaymentStatus(D(0), grandTotal),
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });
      for (const l of lines) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: sale.branchId,
          productId: l.productId,
          delta: l.quantity, // restock (avg cost unchanged — no cost supplied)
        });
      }
      return ret;
    });
  }

  async findAll(
    tenantId: string,
    query: SaleReturnQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySaleReturnWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.saleId ? { saleId: query.saleId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySaleReturn.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventorySaleReturn.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const ret = await this.prisma.inventorySaleReturn.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: true,
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
    if (!ret) throw new SaleReturnNotFoundException(id);
    return ret;
  }

  /**
   * Fetch a return enriched for the detail modal (EZHT `modal_view` for a
   * returned sale): the originating sale's reference/customer + warehouse (From/To
   * blocks), the created-by staff name, items and payments. Best-effort lookups
   * degrade to `null`.
   */
  async getDetail(id: string, tenantId: string) {
    const ret = await this.findById(id, tenantId);
    const [sale, warehouse, createdByName] = await Promise.all([
      this.prisma.inventorySale.findFirst({
        where: { id: ret.saleId, tenantId },
        select: {
          reference: true,
          date: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
              gstNo: true,
            },
          },
        },
      }),
      resolveWarehouseDetail(this.branchClient, ret.branchId),
      resolveUserName(this.usersClient, ret.createdBy),
    ]);
    return { ...ret, sale, warehouse, createdByName };
  }

  // ── Payments (EZHT add_payment / payments) ───────────────────────────────

  /** Payment history for a return (EZHT `sales/payments`). */
  async listPayments(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventorySaleReturnPayment.findMany({
      where: { returnId: id, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Record a payment against a return. Mirrors EZHT: BLOCKED once the return is
   * fully settled (`paid >= grandTotal`); otherwise the amount must not exceed the
   * outstanding balance.
   */
  async addPayment(
    id: string,
    tenantId: string,
    dto: CreateSalePaymentDto,
    actorId?: string,
  ) {
    const ret = await this.findById(id, tenantId);
    const grandTotal = D(ret.grandTotal);
    const paid = D(ret.paid);
    // EZHT guard: a fully-paid return takes no further payment.
    if (paid.gte(grandTotal)) {
      throw new SaleReturnPaymentBlockedException(id);
    }
    const amount = D(dto.amount);
    const outstanding = grandTotal.sub(paid);
    if (amount.gt(outstanding)) {
      throw new SalePaymentExceedsBalanceException(
        outstanding.toNumber(),
        amount.toNumber(),
      );
    }
    const newPaid = paid.add(amount);
    const paymentStatus = derivePaymentStatus(newPaid, grandTotal);

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySaleReturnPayment.create({
        data: {
          tenantId,
          returnId: id,
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
      return tx.inventorySaleReturn.update({
        where: { id },
        data: { paid: newPaid, paymentStatus },
        include: {
          payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        },
      });
    });
  }

  /** Edit a return payment, then recompute paid + status. */
  async editPayment(
    id: string,
    paymentId: string,
    tenantId: string,
    dto: UpdateSalePaymentDto,
  ) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventorySaleReturnPayment.findFirst({
      where: { id: paymentId, returnId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new SaleReturnNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySaleReturnPayment.update({
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

  /** Soft-delete a return payment, then recompute paid + status. */
  async deletePayment(id: string, paymentId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventorySaleReturnPayment.findFirst({
      where: { id: paymentId, returnId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new SaleReturnNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventorySaleReturnPayment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
      return this.recomputePaid(tx, id);
    });
  }

  private async recomputePaid(tx: Prisma.TransactionClient, id: string) {
    const agg = await tx.inventorySaleReturnPayment.aggregate({
      where: { returnId: id, deletedAt: null },
      _sum: { amount: true },
    });
    const ret = await tx.inventorySaleReturn.findUniqueOrThrow({
      where: { id },
      select: { grandTotal: true },
    });
    const paid = agg._sum.amount ?? D(0);
    const paymentStatus = derivePaymentStatus(paid, D(ret.grandTotal));
    return tx.inventorySaleReturn.update({
      where: { id },
      data: { paid, paymentStatus },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
  }

  /**
   * Render the return's PDF through kalnostics' print-template engine (the mapped
   * `inventory_sale_return` template), mirroring {@link SaleService.renderInvoicePdf}.
   * @returns the rendered PDF buffer with the return reference (for the filename)
   */
  async renderReturnPdf(
    id: string,
    tenantId: string,
  ): Promise<{ pdf: Buffer; reference: string }> {
    const ret = await this.getDetail(id, tenantId);
    const settings = await this.settingsService.get(tenantId, ret.branchId);
    const money = (v: Prisma.Decimal | number | string) => D(v).toFixed(2);
    const balance = D(ret.grandTotal).sub(ret.paid);

    const variables: Record<string, unknown> = {
      return_number: ret.reference,
      sale_reference: ret.saleReference ?? ret.sale?.reference ?? '',
      return_date: ret.date.toISOString().slice(0, 10),
      customer_name: ret.customer ?? ret.sale?.customer?.name ?? '',
      customer_phone: ret.sale?.customer?.phone ?? '',
      customer_email: ret.sale?.customer?.email ?? '',
      customer_address: ret.sale?.customer?.address ?? '',
      customer_gst: ret.sale?.customer?.gstNo ?? '',
      business_name: settings.businessName ?? ret.warehouse?.name ?? '',
      business_address: settings.businessAddress ?? '',
      business_phone: settings.businessPhone ?? '',
      business_email: settings.businessEmail ?? '',
      warehouse_name: ret.warehouse?.name ?? '',
      subtotal: money(ret.total),
      total_tax: money(ret.totalTax),
      order_discount: money(ret.orderDiscount),
      surcharge: money(ret.surcharge),
      grand_total: money(ret.grandTotal),
      paid: money(ret.paid),
      balance: money(balance),
      payment_status: ret.paymentStatus,
      note: ret.note ?? '',
    };

    const items = ret.items.map((it) => ({
      product_name: it.productName,
      product_code: it.productCode ?? '',
      serial_no: it.serialNo ?? '',
      quantity: D(it.quantity).toFixed(2),
      unit_price: money(it.price),
      subtotal: money(it.subtotal),
    }));

    const pdf = await this.printTemplateClient.renderByType(
      'inventory_sale_return',
      { variables, sections: { items } },
    );
    return { pdf, reference: ret.reference };
  }
}
