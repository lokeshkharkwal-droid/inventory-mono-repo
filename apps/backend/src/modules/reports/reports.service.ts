import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** Resolve a report date range, defaulting to the last 30 days. */
function resolveRange(from?: string, to?: string): { gte: Date; lte: Date } {
  const lte = to ? new Date(to) : new Date();
  const gte = from ? new Date(from) : new Date(lte.getTime() - 30 * 86_400_000);
  return { gte, lte };
}

/**
 * Read-only reporting aggregations over the inventory tables (no new tables).
 * All queries are tenant-scoped; money is summed with Prisma.Decimal and the
 * ResponseInterceptor converts Decimals to numbers on the way out.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard summary cards. */
  async dashboard(tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [productCount, todaySalesAgg, stockRows, products] =
      await Promise.all([
        this.prisma.inventoryProduct.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.inventorySale.aggregate({
          where: { tenantId, deletedAt: null, date: { gte: todayStart } },
          _sum: { grandTotal: true },
          _count: true,
        }),
        this.prisma.inventoryWarehouseProduct.findMany({
          where: { tenantId, deletedAt: null },
          select: { quantity: true, avgCost: true },
        }),
        this.prisma.inventoryProduct.findMany({
          where: { tenantId, deletedAt: null },
          select: {
            alertQuantity: true,
            warehouseStocks: {
              where: { deletedAt: null },
              select: { quantity: true },
            },
          },
        }),
      ]);

    const stockValue = stockRows.reduce(
      (s, r) => s.add(r.quantity.mul(r.avgCost)),
      D(0),
    );
    const lowStockCount = products.filter((p) => {
      const total = p.warehouseStocks.reduce((s, w) => s.add(w.quantity), D(0));
      return total.lte(p.alertQuantity);
    }).length;

    return {
      productCount,
      todaySalesTotal: todaySalesAgg._sum.grandTotal ?? D(0),
      todaySalesCount: todaySalesAgg._count,
      stockValue,
      lowStockCount,
    };
  }

  /** Sales totals for a date range. */
  async salesSummary(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const agg = await this.prisma.inventorySale.aggregate({
      where: { tenantId, deletedAt: null, date },
      _sum: { grandTotal: true, paid: true },
      _count: true,
    });
    const gross = agg._sum.grandTotal ?? D(0);
    const paid = agg._sum.paid ?? D(0);
    return {
      count: agg._count,
      gross,
      paid,
      due: gross.sub(paid),
      from: date.gte,
      to: date.lte,
    };
  }

  /** Purchase totals for a date range. */
  async purchaseSummary(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const agg = await this.prisma.inventoryPurchase.aggregate({
      where: { tenantId, deletedAt: null, date },
      _sum: { grandTotal: true, paid: true },
      _count: true,
    });
    const gross = agg._sum.grandTotal ?? D(0);
    const paid = agg._sum.paid ?? D(0);
    return {
      count: agg._count,
      gross,
      paid,
      due: gross.sub(paid),
      from: date.gte,
      to: date.lte,
    };
  }

  /** Top products by revenue in a date range. */
  async productSales(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const rows = await this.prisma.inventorySaleItem.groupBy({
      by: ['productId', 'productName'],
      where: { tenantId, sale: { deletedAt: null, date } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantity: r._sum.quantity ?? D(0),
      revenue: r._sum.subtotal ?? D(0),
    }));
  }

  /** Per-product stock valuation (top 50 by value) + the total. */
  async inventoryValuation(tenantId: string) {
    const rows = await this.prisma.inventoryWarehouseProduct.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        quantity: true,
        avgCost: true,
        branchId: true,
        product: { select: { id: true, name: true, code: true } },
      },
    });
    const valued = rows
      .map((r) => ({
        productId: r.product.id,
        productName: r.product.name,
        productCode: r.product.code,
        branchId: r.branchId,
        quantity: r.quantity,
        avgCost: r.avgCost,
        value: r.quantity.mul(r.avgCost),
      }))
      .sort((a, b) => b.value.comparedTo(a.value));
    const total = valued.reduce((s, r) => s.add(r.value), D(0));
    return { total, items: valued.slice(0, 50) };
  }

  /** Products at or below their reorder alert level. */
  async lowStock(tenantId: string) {
    const products = await this.prisma.inventoryProduct.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        alertQuantity: true,
        warehouseStocks: {
          where: { deletedAt: null },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return products
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        alertQuantity: p.alertQuantity,
        totalQuantity: p.warehouseStocks.reduce(
          (s, w) => s.add(w.quantity),
          D(0),
        ),
      }))
      .filter((p) => p.totalQuantity.lte(p.alertQuantity));
  }

  /** Batches expiring within `days` days (default 30). */
  async expiry(tenantId: string, days = 30) {
    const until = new Date(Date.now() + days * 86_400_000);
    const rows = await this.prisma.inventoryProductBatch.findMany({
      where: {
        tenantId,
        deletedAt: null,
        quantity: { gt: 0 },
        expiryDate: { not: null, lte: until },
      },
      select: {
        id: true,
        batchNo: true,
        expiryDate: true,
        quantity: true,
        branchId: true,
        product: { select: { name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 200,
    });
    return rows;
  }

  /** Simplified GST/tax summary: output (sales) vs input (purchases) tax. */
  async taxSummary(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const [sales, purchases] = await Promise.all([
      this.prisma.inventorySale.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { orderTax: true },
      }),
      this.prisma.inventoryPurchase.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { orderTax: true },
      }),
    ]);
    const outputTax = sales._sum.orderTax ?? D(0);
    const inputTax = purchases._sum.orderTax ?? D(0);
    return {
      outputTax,
      inputTax,
      netPayable: outputTax.sub(inputTax),
      from: date.gte,
      to: date.lte,
    };
  }

  /** Gross profit = sale revenue − COGS (from snapshotted line cost). */
  async profit(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const items = await this.prisma.inventorySaleItem.findMany({
      where: { tenantId, sale: { deletedAt: null, date } },
      select: { quantity: true, subtotal: true, cost: true },
    });
    let revenue = D(0);
    let cogs = D(0);
    for (const i of items) {
      revenue = revenue.add(i.subtotal);
      cogs = cogs.add(i.cost.mul(i.quantity));
    }
    return {
      revenue,
      cogs,
      profit: revenue.sub(cogs),
      from: date.gte,
      to: date.lte,
    };
  }

  /**
   * GSTR-1 — outward (sales) supplies grouped by GST rate. Taxable value is the
   * line subtotal; the tax amount is split 50/50 into CGST/SGST (intra-state
   * default, since we don't capture place-of-supply) with IGST left at zero.
   * Ported from the legacy GST report's rate-wise aggregation.
   */
  async gstr1(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const items = await this.prisma.inventorySaleItem.findMany({
      where: { tenantId, sale: { deletedAt: null, date } },
      select: { taxRate: true, taxAmount: true, subtotal: true },
    });
    return this.groupByGstRate(items, date);
  }

  /**
   * GSTR-2 (ITC) — inward (purchase) supplies grouped by GST rate. Same shape as
   * {@link gstr1}; this is the input-tax-credit side.
   */
  async gstr2(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const items = await this.prisma.inventoryPurchaseItem.findMany({
      where: { tenantId, purchase: { deletedAt: null, date } },
      select: { taxRate: true, taxAmount: true, subtotal: true },
    });
    return this.groupByGstRate(items, date);
  }

  /**
   * GSTR-3B — monthly summary: outward tax liability vs eligible ITC and the net
   * GST payable.
   */
  async gstr3b(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const [out, inp] = await Promise.all([
      this.gstr1(tenantId, from, to),
      this.gstr2(tenantId, from, to),
    ]);
    const netPayable = out.totals.taxAmount.sub(inp.totals.taxAmount);
    return {
      outward: out.totals,
      inwardItc: inp.totals,
      netPayable,
      from: date.gte,
      to: date.lte,
    };
  }

  /** Group GST line items by rate into taxable value + CGST/SGST/IGST split. */
  private groupByGstRate(
    items: {
      taxRate: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }[],
    date: { gte: Date; lte: Date },
  ) {
    const byRate = new Map<
      string,
      {
        rate: Prisma.Decimal;
        taxableValue: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
      }
    >();
    for (const i of items) {
      const key = i.taxRate.toString();
      const g = byRate.get(key) ?? {
        rate: i.taxRate,
        taxableValue: D(0),
        taxAmount: D(0),
      };
      g.taxableValue = g.taxableValue.add(i.subtotal);
      g.taxAmount = g.taxAmount.add(i.taxAmount);
      byRate.set(key, g);
    }
    const rows = [...byRate.values()]
      .sort((a, b) => a.rate.comparedTo(b.rate))
      .map((g) => ({
        rate: g.rate,
        taxableValue: g.taxableValue,
        cgst: g.taxAmount.div(2),
        sgst: g.taxAmount.div(2),
        igst: D(0),
        taxAmount: g.taxAmount,
      }));
    const totals = rows.reduce(
      (t, r) => ({
        taxableValue: t.taxableValue.add(r.taxableValue),
        cgst: t.cgst.add(r.cgst),
        sgst: t.sgst.add(r.sgst),
        igst: t.igst.add(r.igst),
        taxAmount: t.taxAmount.add(r.taxAmount),
      }),
      {
        taxableValue: D(0),
        cgst: D(0),
        sgst: D(0),
        igst: D(0),
        taxAmount: D(0),
      },
    );
    return { rows, totals, from: date.gte, to: date.lte };
  }

  /**
   * Profit & loss statement: sale revenue − COGS = gross profit; less standalone
   * expenses, plus standalone incomes = net profit, for a date range.
   */
  async profitLoss(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const [saleItems, expenseAgg, incomeAgg] = await Promise.all([
      this.prisma.inventorySaleItem.findMany({
        where: { tenantId, sale: { deletedAt: null, date } },
        select: { quantity: true, subtotal: true, cost: true },
      }),
      this.prisma.inventoryExpense.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { amount: true },
      }),
      this.prisma.inventoryIncome.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { amount: true },
      }),
    ]);
    let revenue = D(0);
    let cogs = D(0);
    for (const i of saleItems) {
      revenue = revenue.add(i.subtotal);
      cogs = cogs.add(i.cost.mul(i.quantity));
    }
    const grossProfit = revenue.sub(cogs);
    const expenses = expenseAgg._sum.amount ?? D(0);
    const otherIncome = incomeAgg._sum.amount ?? D(0);
    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      otherIncome,
      netProfit: grossProfit.sub(expenses).add(otherIncome),
      from: date.gte,
      to: date.lte,
    };
  }

  /**
   * Party ledger — a running statement for one customer or supplier: each
   * invoice increases the balance owed, each payment reduces it. Ordered by date.
   */
  async partyLedger(
    tenantId: string,
    party: 'customer' | 'supplier',
    partyId: string,
    from?: string,
    to?: string,
  ) {
    const date = resolveRange(from, to);
    type Entry = {
      date: Date;
      reference: string;
      type: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
    };
    const entries: Entry[] = [];

    if (party === 'customer') {
      const sales = await this.prisma.inventorySale.findMany({
        where: { tenantId, deletedAt: null, customerId: partyId, date },
        select: {
          reference: true,
          date: true,
          grandTotal: true,
          payments: {
            where: { deletedAt: null },
            select: { amount: true, date: true },
          },
        },
      });
      for (const s of sales) {
        entries.push({
          date: s.date,
          reference: s.reference,
          type: 'INVOICE',
          debit: s.grandTotal,
          credit: D(0),
        });
        for (const p of s.payments) {
          entries.push({
            date: p.date,
            reference: s.reference,
            type: 'PAYMENT',
            debit: D(0),
            credit: p.amount,
          });
        }
      }
    } else {
      const purchases = await this.prisma.inventoryPurchase.findMany({
        where: { tenantId, deletedAt: null, supplierId: partyId, date },
        select: {
          reference: true,
          date: true,
          grandTotal: true,
          payments: {
            where: { deletedAt: null },
            select: { amount: true, date: true },
          },
        },
      });
      for (const pu of purchases) {
        entries.push({
          date: pu.date,
          reference: pu.reference,
          type: 'BILL',
          debit: pu.grandTotal,
          credit: D(0),
        });
        for (const p of pu.payments) {
          entries.push({
            date: p.date,
            reference: pu.reference,
            type: 'PAYMENT',
            debit: D(0),
            credit: p.amount,
          });
        }
      }
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    let balance = D(0);
    const rows = entries.map((e) => {
      balance = balance.add(e.debit).sub(e.credit);
      return { ...e, balance };
    });
    return { rows, closingBalance: balance, from: date.gte, to: date.lte };
  }

  /** Sales totalled per day over a date range (for the trend/daily report). */
  async salesDaily(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const sales = await this.prisma.inventorySale.findMany({
      where: { tenantId, deletedAt: null, date },
      select: { date: true, grandTotal: true },
    });
    const byDay = new Map<string, { total: Prisma.Decimal; count: number }>();
    for (const s of sales) {
      const key = s.date.toISOString().slice(0, 10);
      const e = byDay.get(key) ?? { total: D(0), count: 0 };
      e.total = e.total.add(s.grandTotal);
      e.count++;
      byDay.set(key, e);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, e]) => ({ day, total: e.total, count: e.count }));
  }

  /** Sales totalled per calendar month over a date range. */
  async salesMonthly(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const sales = await this.prisma.inventorySale.findMany({
      where: { tenantId, deletedAt: null, date },
      select: { date: true, grandTotal: true },
    });
    const byMonth = new Map<string, { total: Prisma.Decimal; count: number }>();
    for (const s of sales) {
      const key = s.date.toISOString().slice(0, 7);
      const e = byMonth.get(key) ?? { total: D(0), count: 0 };
      e.total = e.total.add(s.grandTotal);
      e.count++;
      byMonth.set(key, e);
    }
    return [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, e]) => ({ month, total: e.total, count: e.count }));
  }

  /** Top customers by sales value in a date range. */
  async topCustomers(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const rows = await this.prisma.inventorySale.groupBy({
      by: ['customerId'],
      where: { tenantId, deletedAt: null, date },
      _sum: { grandTotal: true, paid: true },
      _count: true,
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 20,
    });
    const ids = rows.map((r) => r.customerId).filter((x): x is string => !!x);
    const names = await this.prisma.inventoryCustomer.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, name: true },
    });
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    return rows.map((r) => ({
      customerId: r.customerId,
      customerName: nameOf.get(r.customerId ?? '') ?? '—',
      orders: r._count,
      gross: r._sum.grandTotal ?? D(0),
      paid: r._sum.paid ?? D(0),
    }));
  }

  /** Top suppliers by purchase value in a date range. */
  async topSuppliers(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const rows = await this.prisma.inventoryPurchase.groupBy({
      by: ['supplierId'],
      where: { tenantId, deletedAt: null, date },
      _sum: { grandTotal: true, paid: true },
      _count: true,
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 20,
    });
    const ids = rows.map((r) => r.supplierId).filter((x): x is string => !!x);
    const names = await this.prisma.inventorySupplier.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, name: true },
    });
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    return rows.map((r) => ({
      supplierId: r.supplierId,
      supplierName: nameOf.get(r.supplierId ?? '') ?? '—',
      orders: r._count,
      gross: r._sum.grandTotal ?? D(0),
      paid: r._sum.paid ?? D(0),
    }));
  }

  /** Stock valuation grouped by product category. */
  async stockByCategory(tenantId: string) {
    const rows = await this.prisma.inventoryWarehouseProduct.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        quantity: true,
        avgCost: true,
        product: {
          select: { category: { select: { id: true, name: true } } },
        },
      },
    });
    const byCat = new Map<
      string,
      { name: string; quantity: Prisma.Decimal; value: Prisma.Decimal }
    >();
    for (const r of rows) {
      const cat = r.product.category;
      const key = cat?.id ?? 'uncategorised';
      const e = byCat.get(key) ?? {
        name: cat?.name ?? 'Uncategorised',
        quantity: D(0),
        value: D(0),
      };
      e.quantity = e.quantity.add(r.quantity);
      e.value = e.value.add(r.quantity.mul(r.avgCost));
      byCat.set(key, e);
    }
    return [...byCat.values()].sort((a, b) => b.value.comparedTo(a.value));
  }

  /** Sales grouped by the staff member who created them (register/staff report). */
  async salesByUser(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const rows = await this.prisma.inventorySale.groupBy({
      by: ['createdBy'],
      where: { tenantId, deletedAt: null, date },
      _sum: { grandTotal: true },
      _count: true,
      orderBy: { _sum: { grandTotal: 'desc' } },
    });
    return rows.map((r) => ({
      userId: r.createdBy ?? 'unknown',
      orders: r._count,
      gross: r._sum.grandTotal ?? D(0),
    }));
  }

  /** Payments received (sales) vs made (purchases) in a date range. */
  async payments(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const [received, made] = await Promise.all([
      this.prisma.inventorySalePayment.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.inventoryPurchasePayment.aggregate({
        where: { tenantId, deletedAt: null, date },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    return {
      received: received._sum.amount ?? D(0),
      receivedCount: received._count,
      made: made._sum.amount ?? D(0),
      madeCount: made._count,
      from: date.gte,
      to: date.lte,
    };
  }

  /** Sales revenue grouped by product brand. */
  async salesByBrand(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    const items = await this.prisma.inventorySaleItem.groupBy({
      by: ['productId'],
      where: { tenantId, sale: { deletedAt: null, date } },
      _sum: { quantity: true, subtotal: true },
    });
    // Resolve each product's brand (sale items are denormalised — no relation).
    const products = await this.prisma.inventoryProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) }, tenantId },
      select: { id: true, brand: { select: { id: true, name: true } } },
    });
    const brandOf = new Map(products.map((p) => [p.id, p.brand ?? null]));
    const byBrand = new Map<
      string,
      { name: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal }
    >();
    for (const i of items) {
      const b = brandOf.get(i.productId) ?? null;
      const key = b?.id ?? 'none';
      const e = byBrand.get(key) ?? {
        name: b?.name ?? 'No brand',
        quantity: D(0),
        revenue: D(0),
      };
      e.quantity = e.quantity.add(i._sum.quantity ?? D(0));
      e.revenue = e.revenue.add(i._sum.subtotal ?? D(0));
      byBrand.set(key, e);
    }
    return [...byBrand.values()].sort((a, b) =>
      b.revenue.comparedTo(a.revenue),
    );
  }

  /** POS register session log (open/close + cash) for a date range. */
  async registerLog(tenantId: string, from?: string, to?: string) {
    const date = resolveRange(from, to);
    return this.prisma.inventoryPosRegisterSession.findMany({
      where: { tenantId, openedAt: date },
      orderBy: { openedAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Financial statement: composes the P&L, payments and net-tax reports for the
   * period into a single statement.
   */
  async financialStatement(tenantId: string, from?: string, to?: string) {
    const [pnl, pay, tax] = await Promise.all([
      this.profitLoss(tenantId, from, to),
      this.payments(tenantId, from, to),
      this.taxSummary(tenantId, from, to),
    ]);
    return {
      revenue: pnl.revenue,
      cogs: pnl.cogs,
      grossProfit: pnl.grossProfit,
      expenses: pnl.expenses,
      otherIncome: pnl.otherIncome,
      netProfit: pnl.netProfit,
      paymentsReceived: pay.received,
      paymentsMade: pay.made,
      netTaxPayable: tax.netPayable,
      from: pnl.from,
      to: pnl.to,
    };
  }
}
