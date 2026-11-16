import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * Sales + finance reports migrated from the legacy EZHealthTrack Reports.php:
 * daily-sales, monthly-sales, sales, sales-tax, sales-quantity, payments, gst,
 * profit-loss (legacy cash-flow dashboard) and profit-loss-sales (per-line
 * margin). Every query is tenant-scoped; money/qty is summed with Prisma.Decimal
 * and the ResponseInterceptor converts Decimals to numbers on the way out.
 *
 * Where a legacy column has no source in the new Prisma schema (per-sale product
 * tax / IGST / CGST / SGST, the clinical order_product "investigations" link,
 * sale-line serial numbers, the biller entity, refund/"returned" payments, and
 * the received-by-channel PayPal/Stripe legs) the value is derived from the
 * closest equivalent or returned as 0 / null and flagged — the report degrades
 * gracefully rather than fabricating data.
 */
@Injectable()
export class ReportsSalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily Sales — a per-day roll-up for one month (calendar grid). For each day
   * of the requested year-month aggregates discount, shipping, order tax, grand
   * total and a reconstructed product tax (Σ sale-line taxAmount, since the sale
   * header has no product_tax column). Optionally scoped to one warehouse
   * (branchId) and/or one staff member (createdBy). Returns a dense array with an
   * entry for every day of the month (zero-filled) so the FE can render each cell.
   * @param tenantId tenant from the JWT (never the body).
   * @param q year/month plus optional warehouseId + createdBy.
   * @returns { year, month, warehouseId, userId, days[], totals }.
   */
  async dailySales(tenantId: string, q: ReportQueryDto) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    const branchId = q.warehouseId ?? q.branchId;
    const userId = q.createdBy ?? null;

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = monthEnd.getDate();

    const sales = await this.prisma.inventorySale.findMany({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: monthStart, lte: monthEnd },
        ...(branchId ? { branchId } : {}),
        ...(userId ? { createdBy: userId } : {}),
      },
      select: {
        date: true,
        orderDiscount: true,
        shipping: true,
        orderTax: true,
        grandTotal: true,
        items: { select: { taxAmount: true } },
      },
    });

    type Day = {
      day: number;
      date: string;
      count: number;
      discount: Prisma.Decimal;
      shipping: Prisma.Decimal;
      productTax: Prisma.Decimal;
      orderTax: Prisma.Decimal;
      total: Prisma.Decimal;
    };
    const days: Day[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      days.push({
        day: d,
        date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        count: 0,
        discount: D(0),
        shipping: D(0),
        productTax: D(0),
        orderTax: D(0),
        total: D(0),
      });
    }

    for (const s of sales) {
      const idx = s.date.getDate() - 1;
      const bucket = days[idx];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.discount = bucket.discount.add(s.orderDiscount);
      bucket.shipping = bucket.shipping.add(s.shipping);
      bucket.orderTax = bucket.orderTax.add(s.orderTax);
      bucket.total = bucket.total.add(s.grandTotal);
      for (const it of s.items)
        bucket.productTax = bucket.productTax.add(it.taxAmount);
    }

    const totals = days.reduce(
      (t, d) => {
        t.discount = t.discount.add(d.discount);
        t.shipping = t.shipping.add(d.shipping);
        t.productTax = t.productTax.add(d.productTax);
        t.orderTax = t.orderTax.add(d.orderTax);
        t.grandTotal = t.grandTotal.add(d.total);
        t.salesCount += d.count;
        if (d.count > 0) t.daysWithSales += 1;
        return t;
      },
      {
        discount: D(0),
        shipping: D(0),
        productTax: D(0),
        orderTax: D(0),
        grandTotal: D(0),
        salesCount: 0,
        daysWithSales: 0,
      },
    );

    return { year, month, warehouseId: branchId ?? null, userId, days, totals };
  }

  /**
   * Monthly Sales — a per-month roll-up for one year (Jan..Dec, always all 12,
   * zero-filled). Mirrors dailySales but buckets by calendar month: discount,
   * shipping, order tax, grand total and a reconstructed product tax (Σ sale-line
   * taxAmount). Optionally scoped to one warehouse (branchId) and/or staff member.
   * @param tenantId tenant from the JWT.
   * @param q year plus optional warehouseId + createdBy.
   * @returns { year, warehouseId, userId, months[12], totals }.
   */
  async monthlySales(tenantId: string, q: ReportQueryDto) {
    const year = q.year ?? new Date().getFullYear();
    const branchId = q.warehouseId ?? q.branchId;
    const userId = q.createdBy ?? null;

    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const sales = await this.prisma.inventorySale.findMany({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: yearStart, lte: yearEnd },
        ...(branchId ? { branchId } : {}),
        ...(userId ? { createdBy: userId } : {}),
      },
      select: {
        date: true,
        orderDiscount: true,
        shipping: true,
        orderTax: true,
        grandTotal: true,
        items: { select: { taxAmount: true } },
      },
    });

    const MONTH_LABELS = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    type Month = {
      month: number;
      label: string;
      count: number;
      discount: Prisma.Decimal;
      shipping: Prisma.Decimal;
      productTax: Prisma.Decimal;
      orderTax: Prisma.Decimal;
      total: Prisma.Decimal;
    };
    const months: Month[] = MONTH_LABELS.map((label, i) => ({
      month: i + 1,
      label,
      count: 0,
      discount: D(0),
      shipping: D(0),
      productTax: D(0),
      orderTax: D(0),
      total: D(0),
    }));

    for (const s of sales) {
      const bucket = months[s.date.getMonth()];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.discount = bucket.discount.add(s.orderDiscount);
      bucket.shipping = bucket.shipping.add(s.shipping);
      bucket.orderTax = bucket.orderTax.add(s.orderTax);
      bucket.total = bucket.total.add(s.grandTotal);
      for (const it of s.items)
        bucket.productTax = bucket.productTax.add(it.taxAmount);
    }

    const totals = months.reduce(
      (t, m) => ({
        discount: t.discount.add(m.discount),
        shipping: t.shipping.add(m.shipping),
        productTax: t.productTax.add(m.productTax),
        orderTax: t.orderTax.add(m.orderTax),
        total: t.total.add(m.total),
      }),
      {
        discount: D(0),
        shipping: D(0),
        productTax: D(0),
        orderTax: D(0),
        total: D(0),
      },
    );

    return { year, warehouseId: branchId ?? null, userId, months, totals };
  }

  /**
   * Sales Report — one row per sale invoice in range with its reference, biller,
   * customer, product (qty) list, payments list, tax, discount, grand total, paid
   * and computed balance (= grandTotal − paid). Footer sums tax/discount/grand
   * total/paid/balance over the whole filtered set. The legacy clinical
   * "Investigations" column has no source in the inventory schema and is null.
   * @param tenantId tenant from the JWT.
   * @param q date range + optional customerId/createdBy/warehouse/reference/
   *   categoryId/productId/billerName/paymentStatus + page/limit.
   * @returns { rows, totals, page, limit, total }.
   */
  async sales(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 50;

    const where: Prisma.InventorySaleWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.billerName
        ? { billerName: { contains: q.billerName, mode: 'insensitive' } }
        : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.productId || q.categoryId
        ? {
            items: {
              some: {
                ...(q.productId ? { productId: q.productId } : {}),
                ...(q.categoryId
                  ? { product: { categoryId: q.categoryId } }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [total, sales] = await Promise.all([
      this.prisma.inventorySale.count({ where }),
      this.prisma.inventorySale.findMany({
        where,
        select: {
          id: true,
          date: true,
          reference: true,
          billerName: true,
          orderTax: true,
          orderDiscount: true,
          grandTotal: true,
          paid: true,
          paymentStatus: true,
          customer: { select: { name: true } },
          items: { select: { productName: true, quantity: true } },
          payments: {
            where: { deletedAt: null },
            select: { method: true, amount: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 1000),
      }),
    ]);

    const rows = sales.map((s) => {
      const products = s.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
      }));
      const payments = s.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
      }));
      const balance = s.grandTotal.sub(s.paid);
      return {
        id: s.id,
        date: s.date,
        reference: s.reference,
        billerName: s.billerName,
        customerName: s.customer?.name ?? '—',
        products,
        productsLabel: products
          .map((p) => `${p.productName} (${p.quantity.toString()})`)
          .join('\n'),
        investigations: null as string[] | null,
        payments,
        paymentsLabel: payments
          .map((p) => `${p.method} (${p.amount.toString()})`)
          .join('\n'),
        totalTax: s.orderTax,
        totalDiscount: s.orderDiscount,
        grandTotal: s.grandTotal,
        paid: s.paid,
        balance,
        paymentStatus: s.paymentStatus,
      };
    });

    const totals = rows.reduce(
      (t, r) => ({
        totalTax: t.totalTax.add(r.totalTax),
        totalDiscount: t.totalDiscount.add(r.totalDiscount),
        grandTotal: t.grandTotal.add(r.grandTotal),
        paid: t.paid.add(r.paid),
        balance: t.balance.add(r.balance),
      }),
      {
        totalTax: D(0),
        totalDiscount: D(0),
        grandTotal: D(0),
        paid: D(0),
        balance: D(0),
      },
    );

    return { rows, totals, page, limit, total };
  }

  /**
   * Sales Tax Report — per-invoice output-GST register: one row per sale with its
   * product (qty) + payments lists, grand total, product tax (Σ sale-line
   * taxAmount) and a derived IGST/CGST/SGST split. Per-sale IGST/CGST/SGST are
   * NOT stored, so (intra-state convention) IGST = 0 and CGST = SGST = productTax
   * / 2 — the same split the legacy gstr1/gstr3b code uses. Footer sums the five
   * money columns over the filtered set.
   * @param tenantId tenant from the JWT.
   * @param q date range + optional customerId/createdBy/branch/reference/
   *   productId/billerName + page/limit.
   * @returns { rows, totals, page, limit, total, from, to }.
   */
  async salesTax(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 50;

    const where: Prisma.InventorySaleWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.billerName
        ? { billerName: { contains: q.billerName, mode: 'insensitive' } }
        : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.productId ? { items: { some: { productId: q.productId } } } : {}),
    };

    const [total, sales] = await Promise.all([
      this.prisma.inventorySale.count({ where }),
      this.prisma.inventorySale.findMany({
        where,
        select: {
          id: true,
          date: true,
          reference: true,
          billerName: true,
          grandTotal: true,
          customer: { select: { name: true } },
          items: {
            select: { productName: true, quantity: true, taxAmount: true },
          },
          payments: {
            where: { deletedAt: null },
            select: { method: true, amount: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 1000),
      }),
    ]);

    const rows = sales.map((s) => {
      const products = s.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
      }));
      const payments = s.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
      }));
      const productTax = s.items.reduce((sum, i) => sum.add(i.taxAmount), D(0));
      const igst = D(0);
      const cgst = productTax.div(2);
      const sgst = productTax.div(2);
      return {
        saleId: s.id,
        date: s.date,
        reference: s.reference,
        billerName: s.billerName,
        customerName: s.customer?.name ?? '—',
        products,
        productsLabel: products
          .map((p) => `${p.name} (${p.quantity.toString()})`)
          .join('\n'),
        investigations: [] as string[],
        payments,
        paymentsLabel: payments
          .map((p) => `${p.method} (${p.amount.toString()})`)
          .join('\n'),
        grandTotal: s.grandTotal,
        productTax,
        igst,
        cgst,
        sgst,
      };
    });

    const totals = rows.reduce(
      (t, r) => ({
        grandTotal: t.grandTotal.add(r.grandTotal),
        productTax: t.productTax.add(r.productTax),
        igst: t.igst.add(r.igst),
        cgst: t.cgst.add(r.cgst),
        sgst: t.sgst.add(r.sgst),
      }),
      {
        grandTotal: D(0),
        productTax: D(0),
        igst: D(0),
        cgst: D(0),
        sgst: D(0),
      },
    );

    return {
      rows,
      totals,
      page,
      limit,
      total,
      from: date?.gte ?? null,
      to: date?.lte ?? null,
    };
  }

  /**
   * Sales Quantity Report — date-by-product sales volume: one row per
   * (sale-day, product) with the units sold. Quantity-only (the legacy
   * revenue/tax columns were commented out). The Unit column resolves
   * InventoryProduct.unitId → the unit's name (no unit string on the sale line).
   * @param tenantId tenant from the JWT.
   * @param q date range + optional warehouse/customerId/createdBy/productId/
   *   reference + page/limit.
   * @returns { rows, totals, meta }.
   */
  async salesQuantity(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 50;

    const items = await this.prisma.inventorySaleItem.findMany({
      where: {
        tenantId,
        ...(q.productId ? { productId: q.productId } : {}),
        sale: {
          deletedAt: null,
          ...(date ? { date } : {}),
          ...(branchId ? { branchId } : {}),
          ...(q.customerId ? { customerId: q.customerId } : {}),
          ...(q.createdBy ? { createdBy: q.createdBy } : {}),
          ...(q.reference
            ? { reference: { contains: q.reference, mode: 'insensitive' } }
            : {}),
        },
      },
      select: {
        productId: true,
        productCode: true,
        productName: true,
        quantity: true,
        sale: { select: { date: true } },
      },
      take: 1000,
    });

    type Agg = {
      date: string;
      productId: string;
      productCode: string | null;
      productName: string;
      quantity: Prisma.Decimal;
    };
    const byKey = new Map<string, Agg>();
    for (const it of items) {
      const d = it.sale.date;
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const key = `${day}|${it.productId}`;
      const agg = byKey.get(key) ?? {
        date: day,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        quantity: D(0),
      };
      agg.quantity = agg.quantity.add(it.quantity);
      byKey.set(key, agg);
    }

    const productIds = [
      ...new Set([...byKey.values()].map((a) => a.productId)),
    ];
    const products = productIds.length
      ? await this.prisma.inventoryProduct.findMany({
          where: { tenantId, id: { in: productIds } },
          select: { id: true, unit: { select: { name: true } } },
        })
      : [];
    const unitByProduct = new Map(
      products.map((p) => [p.id, p.unit?.name ?? null]),
    );

    const all = [...byKey.values()]
      .map((a) => ({
        date: a.date,
        productId: a.productId,
        productCode: a.productCode,
        productName: a.productName,
        unit: unitByProduct.get(a.productId) ?? null,
        quantity: a.quantity,
      }))
      .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));

    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    const quantity = rows.reduce((s, r) => s.add(r.quantity), D(0));

    return {
      rows,
      totals: { quantity },
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Payments Ledger — a merged ledger of sale-side (received) and purchase-side
   * (sent) payments with signed netting (received +, sent −). Each row carries its
   * source, the linked sale/purchase reference, method ("paid by") and amount.
   * There is no refund/"returned" payment tier in the schema, so `returned` is 0.
   * KPI totals: received, sent, returned (0) and net (= received − sent − returned).
   * @param tenantId tenant from the JWT.
   * @param q date range + optional warehouse/customerId/supplierId/createdBy/
   *   reference (payment ref) + page/limit.
   * @returns { rows, totals, pagination }.
   */
  async payments(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;

    const [salePayments, purchasePayments] = await Promise.all([
      this.prisma.inventorySalePayment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(date ? { date } : {}),
          ...(q.createdBy ? { createdBy: q.createdBy } : {}),
          ...(q.reference
            ? { reference: { contains: q.reference, mode: 'insensitive' } }
            : {}),
          sale: {
            deletedAt: null,
            ...(branchId ? { branchId } : {}),
            ...(q.customerId ? { customerId: q.customerId } : {}),
          },
        },
        select: {
          id: true,
          date: true,
          reference: true,
          method: true,
          amount: true,
          sale: { select: { reference: true } },
        },
        take: 1000,
      }),
      this.prisma.inventoryPurchasePayment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(date ? { date } : {}),
          ...(q.createdBy ? { createdBy: q.createdBy } : {}),
          ...(q.reference
            ? { reference: { contains: q.reference, mode: 'insensitive' } }
            : {}),
          purchase: {
            deletedAt: null,
            ...(branchId ? { branchId } : {}),
            ...(q.supplierId ? { supplierId: q.supplierId } : {}),
          },
        },
        select: {
          id: true,
          date: true,
          reference: true,
          method: true,
          amount: true,
          purchase: { select: { reference: true } },
        },
        take: 1000,
      }),
    ]);

    type Row = {
      id: string;
      source: 'SALE' | 'PURCHASE';
      date: Date;
      paymentRef: string | null;
      saleRef: string | null;
      purchaseRef: string | null;
      paidBy: string;
      amount: Prisma.Decimal;
      type: 'received' | 'sent' | 'returned';
    };
    const all: Row[] = [
      ...salePayments.map((p): Row => ({
        id: p.id,
        source: 'SALE',
        date: p.date,
        paymentRef: p.reference,
        saleRef: p.sale?.reference ?? null,
        purchaseRef: null,
        paidBy: p.method,
        amount: p.amount,
        type: 'received',
      })),
      ...purchasePayments.map((p): Row => ({
        id: p.id,
        source: 'PURCHASE',
        date: p.date,
        paymentRef: p.reference,
        saleRef: null,
        purchaseRef: p.purchase?.reference ?? null,
        paidBy: p.method,
        amount: p.amount,
        type: 'sent',
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const received = salePayments.reduce((s, p) => s.add(p.amount), D(0));
    const sent = purchasePayments.reduce((s, p) => s.add(p.amount), D(0));
    const returned = D(0);
    const net = received.sub(sent).sub(returned);

    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      rows,
      totals: { received, sent, returned, net },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * GST Invoices Report — the legacy on-screen per-invoice GST table: one row per
   * sale with its product (qty) list, grand total, product tax (Σ sale-line
   * taxAmount) and the derived IGST/CGST/SGST split (IGST = 0, CGST = SGST =
   * productTax / 2 — place-of-supply isn't captured). The rate-wise GSTR-1/2/3B
   * filing exports are served separately by the existing ReportsService.
   * @param tenantId tenant from the JWT.
   * @param q date range + optional branch/customerId/createdBy/reference.
   * @returns { rows, totals, from, to }.
   */
  async gst(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;

    const sales = await this.prisma.inventorySale.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(date ? { date } : {}),
        ...(branchId ? { branchId } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.createdBy ? { createdBy: q.createdBy } : {}),
        ...(q.reference
          ? { reference: { contains: q.reference, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        date: true,
        reference: true,
        billerName: true,
        grandTotal: true,
        customer: { select: { name: true } },
        items: {
          select: { productName: true, quantity: true, taxAmount: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const rows = sales.map((s) => {
      const productTax = s.items.reduce((sum, i) => sum.add(i.taxAmount), D(0));
      const igst = D(0);
      const cgst = productTax.div(2);
      const sgst = productTax.div(2);
      return {
        saleId: s.id,
        date: s.date,
        reference: s.reference,
        billerName: s.billerName,
        customerName: s.customer?.name ?? '—',
        items: s.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        grandTotal: s.grandTotal,
        productTax,
        igst,
        cgst,
        sgst,
      };
    });

    const totals = rows.reduce(
      (t, r) => ({
        grandTotal: t.grandTotal.add(r.grandTotal),
        productTax: t.productTax.add(r.productTax),
        igst: t.igst.add(r.igst),
        cgst: t.cgst.add(r.cgst),
        sgst: t.sgst.add(r.sgst),
      }),
      {
        grandTotal: D(0),
        productTax: D(0),
        igst: D(0),
        cgst: D(0),
        sgst: D(0),
      },
    );

    return { rows, totals, from: date?.gte ?? null, to: date?.lte ?? null };
  }

  /**
   * Profit & Loss (legacy cash-flow dashboard) — a KPI snapshot for a range:
   * purchases vs sales (amount/count/paid/tax), payments received (with a
   * by-method breakdown), sent and returned, expenses, incomes, three profit
   * figures (gross / less-sales-tax / net-of-tax-both), a net cash-flow figure,
   * and a per-warehouse (branch) breakdown. Distinct from the COGS-based
   * ReportsService.profitLoss. There is no refund tier, so `returned` is 0; the
   * PayPal-Pro/Stripe method legs are 0 unless those method values are populated.
   * @param tenantId tenant from the JWT.
   * @param q date range (defaults to 1st-of-month → now) + optional branchId.
   * @returns the full KPI object incl. a per-warehouse array.
   */
  async profitLoss(tenantId: string, q: ReportQueryDto) {
    let range = dateFilter(q.from, q.to);
    if (!range) {
      const now = new Date();
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      range = { gte: monthStart, lte: now };
    }
    const branchId = q.warehouseId ?? q.branchId;

    const saleWhere: Prisma.InventorySaleWhereInput = {
      tenantId,
      deletedAt: null,
      date: range,
      status: { not: 'PENDING' },
      ...(branchId ? { branchId } : {}),
    };
    const purchaseWhere: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
      date: range,
      status: 'RECEIVED',
      ...(branchId ? { branchId } : {}),
    };

    const [
      saleAgg,
      purchaseAgg,
      receivedAgg,
      receivedByMethodRaw,
      sentAgg,
      expenseAgg,
      incomeAgg,
    ] = await Promise.all([
      this.prisma.inventorySale.aggregate({
        where: saleWhere,
        _count: { _all: true },
        _sum: { grandTotal: true, paid: true, orderTax: true },
      }),
      this.prisma.inventoryPurchase.aggregate({
        where: purchaseWhere,
        _count: { _all: true },
        _sum: { grandTotal: true, paid: true, orderTax: true },
      }),
      this.prisma.inventorySalePayment.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          date: range,
          sale: { deletedAt: null, ...(branchId ? { branchId } : {}) },
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.inventorySalePayment.groupBy({
        by: ['method'],
        where: {
          tenantId,
          deletedAt: null,
          date: range,
          sale: { deletedAt: null, ...(branchId ? { branchId } : {}) },
        },
        _sum: { amount: true },
      }),
      this.prisma.inventoryPurchasePayment.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          date: range,
          purchase: { deletedAt: null, ...(branchId ? { branchId } : {}) },
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.inventoryExpense.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          date: range,
          ...(branchId ? { branchId } : {}),
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.inventoryIncome.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          date: range,
          ...(branchId ? { branchId } : {}),
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const method = (name: string) =>
      receivedByMethodRaw
        .filter((r) => r.method.toUpperCase() === name)
        .reduce((s, r) => s.add(r._sum.amount ?? D(0)), D(0));

    const salesGrand = saleAgg._sum.grandTotal ?? D(0);
    const salesTax = saleAgg._sum.orderTax ?? D(0);
    const purchaseGrand = purchaseAgg._sum.grandTotal ?? D(0);
    const purchaseTax = purchaseAgg._sum.orderTax ?? D(0);
    const receivedTotal = receivedAgg._sum.amount ?? D(0);
    const sentTotal = sentAgg._sum.amount ?? D(0);
    const returnedTotal = D(0);
    const expensesTotal = expenseAgg._sum.amount ?? D(0);
    const incomesTotal = incomeAgg._sum.amount ?? D(0);

    const gross = salesGrand.sub(purchaseGrand);
    const lessSalesTax = salesGrand.sub(salesTax).sub(purchaseGrand);
    const netOfTaxBoth = salesGrand
      .sub(salesTax)
      .sub(purchaseGrand.sub(purchaseTax));
    const netPayments = receivedTotal
      .sub(returnedTotal)
      .sub(sentTotal)
      .sub(expensesTotal)
      .add(incomesTotal);

    const warehouses = await this.warehouseBreakdown(tenantId, range, branchId);

    return {
      from: range.gte ?? null,
      to: range.lte ?? null,
      purchases: {
        total: purchaseAgg._count._all,
        amount: purchaseGrand,
        paid: purchaseAgg._sum.paid ?? D(0),
        tax: purchaseTax,
      },
      sales: {
        total: saleAgg._count._all,
        amount: salesGrand,
        paid: saleAgg._sum.paid ?? D(0),
        tax: salesTax,
      },
      payments: {
        received: { count: receivedAgg._count._all, amount: receivedTotal },
        receivedByMethod: {
          cash: method('CASH'),
          cc: method('CC'),
          cheque: method('CHEQUE'),
          paypalPro: method('PPP'),
          stripe: method('STRIPE'),
        },
        returned: { count: 0, amount: returnedTotal },
        sent: { count: sentAgg._count._all, amount: sentTotal },
        expenses: { count: expenseAgg._count._all, amount: expensesTotal },
        incomes: { count: incomeAgg._count._all, amount: incomesTotal },
      },
      profitLoss: { gross, lessSalesTax, netOfTaxBoth },
      netPayments,
      warehouses,
    };
  }

  /**
   * Profit & Loss (Sales) — a per-line margin report: one row per sale line with
   * its sale price, snapshotted unit cost, revenue (subtotal), COGS
   * (cost × quantity) and profit (revenue − COGS). The new sale line already
   * snapshots `cost`, so no purchase re-join is needed. Footer sums revenue,
   * COGS, profit and a derived margin %. Serial numbers are not modelled on the
   * sale line (dropped).
   * @param tenantId tenant from the JWT.
   * @param q date range + optional customerId/createdBy/reference/branch/
   *   categoryId/billerName + page/limit.
   * @returns { rows, totals, page, pageSize, total, from, to }.
   */
  async profitLossSales(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const pageSize = q.limit && q.limit > 0 ? q.limit : 50;

    const where: Prisma.InventorySaleItemWhereInput = {
      tenantId,
      ...(q.categoryId ? { product: { categoryId: q.categoryId } } : {}),
      sale: {
        deletedAt: null,
        ...(date ? { date } : {}),
        ...(branchId ? { branchId } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.createdBy ? { createdBy: q.createdBy } : {}),
        ...(q.billerName
          ? { billerName: { contains: q.billerName, mode: 'insensitive' } }
          : {}),
        ...(q.reference
          ? { reference: { contains: q.reference, mode: 'insensitive' } }
          : {}),
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.inventorySaleItem.count({ where }),
      this.prisma.inventorySaleItem.findMany({
        where,
        select: {
          saleId: true,
          productName: true,
          quantity: true,
          price: true,
          cost: true,
          subtotal: true,
          sale: {
            select: {
              date: true,
              reference: true,
              billerName: true,
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { sale: { date: 'desc' } },
        skip: (page - 1) * pageSize,
        take: Math.min(pageSize, 1000),
      }),
    ]);

    const rows = items.map((i) => {
      const totalSales = i.subtotal;
      const totalPurchase = i.cost.mul(i.quantity);
      const profit = totalSales.sub(totalPurchase);
      return {
        saleId: i.saleId,
        date: i.sale.date,
        reference: i.sale.reference,
        billerName: i.sale.billerName,
        customerName: i.sale.customer?.name ?? '—',
        productName: i.productName,
        quantity: i.quantity,
        salePrice: i.price,
        purchasePrice: i.cost,
        totalSales,
        totalPurchase,
        profit,
      };
    });

    const totalSales = rows.reduce((s, r) => s.add(r.totalSales), D(0));
    const totalPurchase = rows.reduce((s, r) => s.add(r.totalPurchase), D(0));
    const profit = totalSales.sub(totalPurchase);
    const marginPct = totalSales.isZero()
      ? D(0)
      : profit.div(totalSales).mul(100);

    return {
      rows,
      totals: { totalSales, totalPurchase, profit, marginPct },
      page,
      pageSize,
      total,
      from: date?.gte ?? null,
      to: date?.lte ?? null,
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * Per-warehouse (branch) profit breakdown used by profitLoss: for each branch
   * that had a sale or purchase in range, sales/purchases amount + tax, net
   * sales/purchases, profit (netSales − netPurchases) and branch expense/income
   * totals. There is no branch/warehouse name model in this schema, so `name` is
   * the branchId and `code` is null.
   */
  private async warehouseBreakdown(
    tenantId: string,
    range: { gte?: Date; lte?: Date },
    branchId?: string,
  ) {
    const [saleByBranch, purchaseByBranch, expenseByBranch, incomeByBranch] =
      await Promise.all([
        this.prisma.inventorySale.groupBy({
          by: ['branchId'],
          where: {
            tenantId,
            deletedAt: null,
            date: range,
            status: { not: 'PENDING' },
            ...(branchId ? { branchId } : {}),
          },
          _sum: { grandTotal: true, orderTax: true },
        }),
        this.prisma.inventoryPurchase.groupBy({
          by: ['branchId'],
          where: {
            tenantId,
            deletedAt: null,
            date: range,
            status: 'RECEIVED',
            ...(branchId ? { branchId } : {}),
          },
          _sum: { grandTotal: true, orderTax: true },
        }),
        this.prisma.inventoryExpense.groupBy({
          by: ['branchId'],
          where: {
            tenantId,
            deletedAt: null,
            date: range,
            ...(branchId ? { branchId } : {}),
          },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        this.prisma.inventoryIncome.groupBy({
          by: ['branchId'],
          where: {
            tenantId,
            deletedAt: null,
            date: range,
            ...(branchId ? { branchId } : {}),
          },
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

    type WH = {
      branchId: string;
      name: string;
      code: string | null;
      salesAmount: Prisma.Decimal;
      salesTax: Prisma.Decimal;
      netSales: Prisma.Decimal;
      purchasesAmount: Prisma.Decimal;
      purchasesTax: Prisma.Decimal;
      netPurchases: Prisma.Decimal;
      profit: Prisma.Decimal;
      expenses: { count: number; amount: Prisma.Decimal };
      incomes: { count: number; amount: Prisma.Decimal };
    };
    const byBranch = new Map<string, WH>();
    const get = (id: string): WH => {
      const existing = byBranch.get(id);
      if (existing) return existing;
      const fresh: WH = {
        branchId: id,
        name: id,
        code: null,
        salesAmount: D(0),
        salesTax: D(0),
        netSales: D(0),
        purchasesAmount: D(0),
        purchasesTax: D(0),
        netPurchases: D(0),
        profit: D(0),
        expenses: { count: 0, amount: D(0) },
        incomes: { count: 0, amount: D(0) },
      };
      byBranch.set(id, fresh);
      return fresh;
    };

    for (const s of saleByBranch) {
      const w = get(s.branchId);
      w.salesAmount = s._sum.grandTotal ?? D(0);
      w.salesTax = s._sum.orderTax ?? D(0);
    }
    for (const p of purchaseByBranch) {
      const w = get(p.branchId);
      w.purchasesAmount = p._sum.grandTotal ?? D(0);
      w.purchasesTax = p._sum.orderTax ?? D(0);
    }
    for (const e of expenseByBranch) {
      if (!e.branchId) continue;
      const w = get(e.branchId);
      w.expenses = { count: e._count._all, amount: e._sum.amount ?? D(0) };
    }
    for (const i of incomeByBranch) {
      if (!i.branchId) continue;
      const w = get(i.branchId);
      w.incomes = { count: i._count._all, amount: i._sum.amount ?? D(0) };
    }

    return [...byBranch.values()].map((w) => {
      const netSales = w.salesAmount.sub(w.salesTax);
      const netPurchases = w.purchasesAmount.sub(w.purchasesTax);
      return {
        ...w,
        netSales,
        netPurchases,
        profit: netSales.sub(netPurchases),
      };
    });
  }
}
