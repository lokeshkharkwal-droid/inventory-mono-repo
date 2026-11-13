import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * Stock / inventory reports migrated from the legacy EZHealthTrack Reports.php:
 * warehouse-stock, materials, tools-and-plants, register, quantity-alerts,
 * expiry-alerts, products, categories, exposures. All queries are tenant-scoped;
 * money is summed with Prisma.Decimal and the ResponseInterceptor converts
 * Decimals to numbers on the way out.
 *
 * Where a legacy column has no source in the new Prisma schema (e.g. material
 * AMC status, POS card/cheque tender split, sale-line "exposure"), the field is
 * returned as null/0 and flagged — the report degrades gracefully rather than
 * fabricating data.
 */
@Injectable()
export class ReportsStockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Warehouse Stock — inventory valuation for one warehouse (branch) or all.
   * Values on-hand stock by the product MASTER price and cost (not avgCost):
   * stockByPrice = Σ(qty × product.price), stockByCost = Σ(qty × product.cost),
   * profitEstimate = stockByPrice − stockByCost. Plus item/quantity KPIs.
   */
  async warehouseStock(tenantId: string, warehouseId?: string) {
    const where: Prisma.InventoryWarehouseProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(warehouseId ? { branchId: warehouseId } : {}),
    };
    const rows = await this.prisma.inventoryWarehouseProduct.findMany({
      where,
      select: { quantity: true, product: { select: { price: true, cost: true } } },
    });
    let stockByPrice = D(0);
    let stockByCost = D(0);
    let totalQuantity = D(0);
    let totalItems = 0;
    for (const r of rows) {
      stockByPrice = stockByPrice.add(r.quantity.mul(r.product.price));
      stockByCost = stockByCost.add(r.quantity.mul(r.product.cost));
      if (!r.quantity.isZero()) {
        totalQuantity = totalQuantity.add(r.quantity);
        totalItems += 1;
      }
    }
    const profitEstimate = stockByPrice.sub(stockByCost);
    return {
      warehouseId: warehouseId ?? null,
      warehouseName: null as string | null,
      stockByPrice,
      stockByCost,
      profitEstimate,
      totalItems,
      totalQuantity,
      chart: [
        { name: 'Stock Value by Price', value: stockByPrice },
        { name: 'Stock Value by Cost', value: stockByCost },
        { name: 'Profit Estimate', value: profitEstimate },
      ],
    };
  }

  /** Materials Report — every material with damage/balance qty + stock value. */
  async materials(tenantId: string, q: ReportQueryDto) {
    return this.materialRows(tenantId, q);
  }

  /** Tools & Plants — the low-value slice of materials (grand total < 1,000,000). */
  async toolsAndPlants(tenantId: string, q: ReportQueryDto) {
    return this.materialRows(tenantId, q, 1_000_000);
  }

  /** Shared materials query; `valueMax` partitions tools-and-plants from M&P. */
  private async materialRows(
    tenantId: string,
    q: ReportQueryDto,
    valueMax?: number,
  ) {
    const date = dateFilter(q.from, q.to);
    const where: Prisma.InventoryMaterialWhereInput = {
      tenantId,
      deletedAt: null,
      ...(q.warehouseId ? { branchId: q.warehouseId } : {}),
      ...(q.categoryId ? { category: q.categoryId } : {}),
      ...(date ? { createdAt: date } : {}),
      ...(q.reference
        ? { code: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { code: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const materials = await this.prisma.inventoryMaterial.findMany({
      where,
      include: {
        damages: { where: { deletedAt: null }, select: { quantity: true } },
        repairs: { where: { deletedAt: null }, select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let grandTotalSum = D(0);
    const rows = materials
      .map((m) => {
        const damageQuantity = m.damages.reduce((s, d) => s.add(d.quantity), D(0));
        const repairQuantity = m.repairs.filter(
          (r) => r.status === 'PENDING' || r.status === 'DUE',
        ).length;
        const balanceQuantity = m.quantity.sub(damageQuantity);
        const grandTotal = balanceQuantity.mul(m.cost);
        return {
          id: m.id,
          date: m.createdAt,
          referenceNo: m.code,
          biller: null as string | null,
          branchName: null as string | null,
          sellerName: null as string | null,
          productName: m.name,
          category: m.category,
          quantity: m.quantity,
          repairQuantity,
          damageQuantity,
          balanceQuantity,
          unitPrice: m.cost,
          grandTotal,
          amcStatus: null as string | null,
          isZeroStock: m.quantity.lte(0),
        };
      })
      .filter((r) =>
        valueMax == null ? true : r.grandTotal.lessThan(valueMax),
      );
    for (const r of rows) grandTotalSum = grandTotalSum.add(r.grandTotal);

    return { rows, totals: { grandTotal: grandTotalSum } };
  }

  /** Register Report — POS open/close sessions with cash reconciliation. */
  async register(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const sessions = await this.prisma.inventoryPosRegisterSession.findMany({
      where: {
        tenantId,
        ...(q.warehouseId || q.branchId
          ? { branchId: q.warehouseId ?? q.branchId }
          : {}),
        ...(q.createdBy ? { openedBy: q.createdBy } : {}),
        ...(date ? { openedAt: date } : {}),
      },
      include: { register: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 500,
    });
    const rows = sessions.map((s) => {
      const cashDeclared = s.expectedCash ?? D(0);
      const cashSubmitted = s.closingCash ?? D(0);
      return {
        id: s.id,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        status: s.status,
        openedBy: s.openedBy,
        closedBy: s.closedBy,
        registerId: s.registerId,
        registerName: s.register?.name ?? '—',
        openingCash: s.openingCash,
        cashDeclared,
        cashSubmitted,
        cashDifference: cashDeclared.sub(cashSubmitted),
        isShort: s.closedAt != null && cashSubmitted.lessThan(cashDeclared),
        note: s.note,
        ccSlips: null as number | null,
        cheques: null as number | null,
      };
    });
    return { from: date?.gte ?? null, to: date?.lte ?? null, rows };
  }

  /** Product Quantity Alerts — products at/below reorder level for a warehouse. */
  async quantityAlerts(tenantId: string, warehouseId?: string, search?: string) {
    const products = await this.prisma.inventoryProduct.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        isStockTracked: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        imageUrl: true,
        alertQuantity: true,
        warehouseStocks: {
          where: {
            deletedAt: null,
            ...(warehouseId ? { branchId: warehouseId } : {}),
          },
          select: { quantity: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    const rows = products
      .map((p) => {
        const quantity = p.warehouseStocks.reduce(
          (s, w) => s.add(w.quantity),
          D(0),
        );
        return {
          productId: p.id,
          imageUrl: p.imageUrl,
          code: p.code,
          name: p.name,
          quantity,
          alertQuantity: p.alertQuantity,
          shortfall: p.alertQuantity.sub(quantity),
        };
      })
      .filter((r) => r.quantity.lessThan(r.alertQuantity));
    return {
      warehouseId: warehouseId ?? null,
      warehouseName: null as string | null,
      rows,
      total: rows.length,
    };
  }

  /** Product Expiry Alerts — in-stock batches expiring before the horizon. */
  async expiryAlerts(tenantId: string, q: ReportQueryDto) {
    const alertDays = q.alertDays ?? 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + alertDays * 86_400_000);
    const batches = await this.prisma.inventoryProductBatch.findMany({
      where: {
        tenantId,
        deletedAt: null,
        quantity: { gt: 0 },
        expiryDate: { not: null, lte: horizon },
        ...(q.warehouseId ? { branchId: q.warehouseId } : {}),
        ...(q.search
          ? {
              product: {
                OR: [
                  { name: { contains: q.search, mode: 'insensitive' } },
                  { code: { contains: q.search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      select: {
        id: true,
        productId: true,
        branchId: true,
        batchNo: true,
        serialNo: true,
        expiryDate: true,
        quantity: true,
        product: { select: { code: true, name: true, imageUrl: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 1000,
    });
    const data = batches.map((b) => {
      const exp = b.expiryDate as Date;
      const expiringDays = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
      return {
        id: b.id,
        productId: b.productId,
        imageUrl: b.product.imageUrl,
        productCode: b.product.code,
        productName: b.product.name,
        branchId: b.branchId,
        warehouseName: null as string | null,
        serialNo: b.serialNo,
        batchNo: b.batchNo,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        expiringDays,
        isExpired: expiringDays < 0,
      };
    });
    return {
      rows: data,
      total: data.length,
      alertDays,
      horizonDate: horizon,
    };
  }

  /** Products Report — per-product purchased/sold/profit/stock over a range. */
  async products(tenantId: string, q: ReportQueryDto) {
    const mv = await this.productMovement(tenantId, q);
    const wantCat = q.categoryId;
    const wantSub = q.subCategoryId;
    const wantProd = q.productId;
    const search = q.search?.toLowerCase();

    const totals = this.zeroMovement();
    const items = mv.products
      .filter((p) => (wantProd ? p.id === wantProd : true))
      .filter((p) => (wantCat ? p.categoryId === wantCat : true))
      .filter((p) => (wantSub ? p.subCategoryId === wantSub : true))
      .filter((p) =>
        search
          ? p.name.toLowerCase().includes(search) ||
            p.code.toLowerCase().includes(search)
          : true,
      )
      .map((p) => {
        const pur = mv.purchase.get(p.id);
        const sal = mv.sale.get(p.id);
        const stk = mv.stock.get(p.id);
        const purchasedQty = pur?.qty ?? D(0);
        const purchaseValue = pur?.value ?? D(0);
        const soldQty = sal?.qty ?? D(0);
        const salesValue = sal?.value ?? D(0);
        const balanceQty = stk?.qty ?? D(0);
        const balanceValue = stk?.value ?? D(0);
        const profit = salesValue.sub(purchaseValue);
        totals.purchasedQty = totals.purchasedQty.add(purchasedQty);
        totals.purchaseValue = totals.purchaseValue.add(purchaseValue);
        totals.soldQty = totals.soldQty.add(soldQty);
        totals.salesValue = totals.salesValue.add(salesValue);
        totals.profit = totals.profit.add(profit);
        totals.balanceQty = totals.balanceQty.add(balanceQty);
        totals.balanceValue = totals.balanceValue.add(balanceValue);
        return {
          productId: p.id,
          code: p.code,
          name: p.name,
          categoryName: p.categoryName,
          purchasedQty,
          purchaseValue,
          soldQty,
          salesValue,
          profit,
          balanceQty,
          balanceValue,
        };
      });
    return { rows: items, totals, range: { from: q.from ?? null, to: q.to ?? null } };
  }

  /** Categories Report — purchased/sold/profit rolled up per product category. */
  async categories(tenantId: string, q: ReportQueryDto) {
    const mv = await this.productMovement(tenantId, q);
    type Row = {
      categoryId: string;
      code: string | null;
      name: string;
      purchasedQty: Prisma.Decimal;
      soldQty: Prisma.Decimal;
      purchasedAmount: Prisma.Decimal;
      soldAmount: Prisma.Decimal;
      profit: Prisma.Decimal;
    };
    const byCat = new Map<string, Row>();
    for (const p of mv.products) {
      if (q.categoryId && p.categoryId !== q.categoryId) continue;
      const row =
        byCat.get(p.categoryId) ??
        ({
          categoryId: p.categoryId,
          code: p.categoryCode,
          name: p.categoryName ?? '—',
          purchasedQty: D(0),
          soldQty: D(0),
          purchasedAmount: D(0),
          soldAmount: D(0),
          profit: D(0),
        } as Row);
      const pur = mv.purchase.get(p.id);
      const sal = mv.sale.get(p.id);
      row.purchasedQty = row.purchasedQty.add(pur?.qty ?? D(0));
      row.purchasedAmount = row.purchasedAmount.add(pur?.value ?? D(0));
      row.soldQty = row.soldQty.add(sal?.qty ?? D(0));
      row.soldAmount = row.soldAmount.add(sal?.value ?? D(0));
      byCat.set(p.categoryId, row);
    }
    const rows = [...byCat.values()].map((r) => ({
      ...r,
      profit: r.soldAmount.sub(r.purchasedAmount),
    }));
    rows.sort((a, b) => b.soldQty.comparedTo(a.soldQty));
    const totals = rows.reduce(
      (t, r) => ({
        purchasedQty: t.purchasedQty.add(r.purchasedQty),
        soldQty: t.soldQty.add(r.soldQty),
        purchasedAmount: t.purchasedAmount.add(r.purchasedAmount),
        soldAmount: t.soldAmount.add(r.soldAmount),
        profit: t.profit.add(r.profit),
      }),
      {
        purchasedQty: D(0),
        soldQty: D(0),
        purchasedAmount: D(0),
        soldAmount: D(0),
        profit: D(0),
      },
    );
    return {
      rows,
      totals,
      meta: {
        from: q.from ?? null,
        to: q.to ?? null,
        categoryId: q.categoryId ?? null,
        branchId: q.branchId ?? null,
      },
    };
  }

  /**
   * Exposure Report — legacy per-sale-line "exposure" metric. The inventory
   * schema has no exposure column, so exposure values are 0 and flagged; the
   * report still lists sales in range so the structure is faithful.
   */
  async exposures(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const sales = await this.prisma.inventorySale.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(date ? { date } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.branchId || q.warehouseId
          ? { branchId: q.branchId ?? q.warehouseId }
          : {}),
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
        customer: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });
    const rows = sales.map((s) => ({
      saleId: s.id,
      date: s.date,
      reference: s.reference,
      biller: s.billerName,
      customer: s.customer?.name ?? '—',
      labTest: null as string | null,
      productExposures: [] as { productName: string; exposure: number }[],
      totalExposure: 0,
    }));
    return {
      rows,
      totals: { totalExposure: 0 },
      dataGap:
        'Sale-line exposure is not modelled in the inventory schema; exposure values are shown as 0.',
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private zeroMovement() {
    return {
      purchasedQty: D(0),
      purchaseValue: D(0),
      soldQty: D(0),
      salesValue: D(0),
      profit: D(0),
      balanceQty: D(0),
      balanceValue: D(0),
    };
  }

  /**
   * Per-product movement building block shared by the products + categories
   * reports: purchased qty/value, sold qty/value and current on-hand qty/value,
   * keyed by productId, plus each product's identity + category.
   */
  private async productMovement(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.branchId ?? q.warehouseId;
    const [purAgg, saleAgg, stockRows, products] = await Promise.all([
      this.prisma.inventoryPurchaseItem.groupBy({
        by: ['productId'],
        where: {
          tenantId,
          purchase: {
            deletedAt: null,
            ...(date ? { date } : {}),
            ...(branchId ? { branchId } : {}),
          },
        },
        _sum: { quantity: true, subtotal: true },
      }),
      this.prisma.inventorySaleItem.groupBy({
        by: ['productId'],
        where: {
          tenantId,
          sale: {
            deletedAt: null,
            ...(date ? { date } : {}),
            ...(branchId ? { branchId } : {}),
          },
        },
        _sum: { quantity: true, subtotal: true },
      }),
      this.prisma.inventoryWarehouseProduct.findMany({
        where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
        select: { productId: true, quantity: true, avgCost: true },
      }),
      this.prisma.inventoryProduct.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          categoryId: true,
          subCategoryId: true,
          category: { select: { code: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const purchase = new Map(
      purAgg.map((r) => [
        r.productId,
        { qty: r._sum.quantity ?? D(0), value: r._sum.subtotal ?? D(0) },
      ]),
    );
    const sale = new Map(
      saleAgg.map((r) => [
        r.productId,
        { qty: r._sum.quantity ?? D(0), value: r._sum.subtotal ?? D(0) },
      ]),
    );
    const stock = new Map<string, { qty: Prisma.Decimal; value: Prisma.Decimal }>();
    for (const s of stockRows) {
      const e = stock.get(s.productId) ?? { qty: D(0), value: D(0) };
      e.qty = e.qty.add(s.quantity);
      e.value = e.value.add(s.quantity.mul(s.avgCost));
      stock.set(s.productId, e);
    }
    return {
      purchase,
      sale,
      stock,
      products: products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        categoryId: p.categoryId,
        subCategoryId: p.subCategoryId,
        categoryCode: p.category?.code ?? null,
        categoryName: p.category?.name ?? null,
      })),
    };
  }
}
