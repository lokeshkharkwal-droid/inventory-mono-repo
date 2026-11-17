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
      select: {
        quantity: true,
        product: { select: { price: true, cost: true } },
      },
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

  /** Material & Plants — the high-value slice (grand total >= 1,000,000). */
  async materialAndPlants(tenantId: string, q: ReportQueryDto) {
    return this.materialRows(tenantId, q, undefined, 1_000_000);
  }

  /**
   * Shared materials query; `valueMax` partitions tools-and-plants (< max) from
   * material-and-plants (`valueMin` ≥ min).
   */
  private async materialRows(
    tenantId: string,
    q: ReportQueryDto,
    valueMax?: number,
    valueMin?: number,
  ) {
    const date = dateFilter(q.from, q.to);
    const where: Prisma.InventoryMaterialWhereInput = {
      tenantId,
      deletedAt: null,
      ...(q.warehouseId ? { branchId: q.warehouseId } : {}),
      ...(q.categoryId ? { category: q.categoryId } : {}),
      ...(q.billerId ? { billerId: q.billerId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(date ? { createdAt: date } : {}),
      ...(q.reference
        ? { code: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      // EZHT's "Serial No" filter was a no-op; here it functionally matches the
      // material code (materials have no separate serial column in this schema).
      ...(q.serial
        ? { code: { contains: q.serial, mode: 'insensitive' } }
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

    // Resolve biller names in one query (InventoryMaterial has no biller relation).
    const billerIds = [
      ...new Set(
        materials.map((m) => m.billerId).filter((b): b is string => !!b),
      ),
    ];
    const billers = billerIds.length
      ? await this.prisma.inventoryBiller.findMany({
          where: { tenantId, id: { in: billerIds } },
          select: { id: true, name: true },
        })
      : [];
    const billerNameOf = new Map(billers.map((b) => [b.id, b.name]));

    let grandTotalSum = D(0);
    let quantitySum = D(0);
    let balanceQuantitySum = D(0);
    const all = materials
      .map((m) => {
        const damageQuantity = m.damages.reduce(
          (s, d) => s.add(d.quantity),
          D(0),
        );
        const repairQuantity = m.repairs.filter(
          (r) => r.status === 'PENDING' || r.status === 'DUE',
        ).length;
        const balanceQuantity = m.quantity.sub(damageQuantity);
        const grandTotal = balanceQuantity.mul(m.cost);
        return {
          id: m.id,
          date: m.createdAt,
          referenceNo: m.code,
          biller: m.billerId ? (billerNameOf.get(m.billerId) ?? null) : null,
          // Branch names live in kalnostics-new, not inventory; the FE maps this
          // branchId → name from the JWT branch profiles (same source as the filter).
          branchId: m.branchId,
          branchName: null as string | null,
          sellerName: m.sellerName,
          productName: m.name,
          category: m.category,
          quantity: m.quantity,
          repairQuantity,
          damageQuantity,
          balanceQuantity,
          unitPrice: m.cost,
          grandTotal,
          amcStatus: m.amcStatus,
          createdBy: m.createdBy,
          isZeroStock: m.quantity.lte(0),
        };
      })
      .filter((r) =>
        valueMax == null ? true : r.grandTotal.lessThan(valueMax),
      )
      .filter((r) =>
        valueMin == null ? true : r.grandTotal.greaterThanOrEqualTo(valueMin),
      );
    for (const r of all) {
      grandTotalSum = grandTotalSum.add(r.grandTotal);
      quantitySum = quantitySum.add(r.quantity);
      balanceQuantitySum = balanceQuantitySum.add(r.balanceQuantity);
    }

    // True server-side pagination: totals span the full filtered set; rows are
    // the requested page slice (limit 100000 = "All"/export returns everything).
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      rows,
      totals: {
        grandTotal: grandTotalSum,
        quantity: quantitySum,
        balanceQuantity: balanceQuantitySum,
      },
      total,
      page,
      limit,
    };
  }

  /** Product Quantity — on-hand quantity per product across warehouses. */
  async productQuantity(tenantId: string, q: ReportQueryDto) {
    const grouped = await this.prisma.inventoryWarehouseProduct.groupBy({
      by: ['productId'],
      where: {
        product: {
          tenantId,
          deletedAt: null,
          ...(q.categoryId ? { categoryId: q.categoryId } : {}),
          ...(q.productId ? { id: q.productId } : {}),
          ...(q.search
            ? {
                OR: [
                  { name: { contains: q.search, mode: 'insensitive' } },
                  { code: { contains: q.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        ...(q.warehouseId ? { branchId: q.warehouseId } : {}),
      },
      _sum: { quantity: true },
    });
    const products = await this.prisma.inventoryProduct.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true, code: true },
    });
    const nameOf = new Map(products.map((p) => [p.id, p]));
    let totalQty = D(0);
    const rows = grouped
      .map((g) => {
        const qty = g._sum.quantity ?? D(0);
        totalQty = totalQty.add(qty);
        const p = nameOf.get(g.productId);
        return {
          productId: g.productId,
          code: p?.code ?? null,
          name: p?.name ?? '—',
          quantity: qty,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows, totals: { quantity: totalQty } };
  }

  /** Product Quantity (Batch) — on-hand quantity per product batch, with expiry. */
  async productQuantityBatch(tenantId: string, q: ReportQueryDto) {
    const batches = await this.prisma.inventoryProductBatch.findMany({
      where: {
        product: {
          tenantId,
          deletedAt: null,
          ...(q.categoryId ? { categoryId: q.categoryId } : {}),
          ...(q.productId ? { id: q.productId } : {}),
          ...(q.search
            ? {
                OR: [
                  { name: { contains: q.search, mode: 'insensitive' } },
                  { code: { contains: q.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      include: { product: { select: { name: true, code: true } } },
      orderBy: [{ expiryDate: 'asc' }],
    });
    let totalQty = D(0);
    const rows = batches.map((b) => {
      totalQty = totalQty.add(b.quantity);
      return {
        id: b.id,
        productName: b.product?.name ?? '—',
        code: b.product?.code ?? null,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
      };
    });
    return { rows, totals: { quantity: totalQty } };
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
      take: 5000,
    });
    const all = sessions.map((s) => {
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
    // Full-set KPI aggregates (the FE cards can't be summed from a page slice).
    let openSessions = 0;
    let shortSessions = 0;
    let netOverShort = D(0);
    for (const r of all) {
      if (r.closedAt == null) openSessions += 1;
      if (r.isShort) shortSessions += 1;
      netOverShort = netOverShort.add(r.cashDifference);
    }
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      from: date?.gte ?? null,
      to: date?.lte ?? null,
      rows,
      totals: { openSessions, shortSessions, netOverShort },
      total,
      page,
      limit,
    };
  }

  /** Product Quantity Alerts — products at/below reorder level for a warehouse. */
  async quantityAlerts(tenantId: string, q: ReportQueryDto) {
    const warehouseId = q.warehouseId;
    const search = q.search;
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
    const all = products
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

    // Totals span the full filtered set so the FE KPI cards stay correct under
    // pagination (they can't sum only the current page slice).
    let totalShortfall = D(0);
    let outOfStock = 0;
    for (const r of all) {
      totalShortfall = totalShortfall.add(r.shortfall);
      if (r.quantity.lte(0)) outOfStock += 1;
    }
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      warehouseId: warehouseId ?? null,
      warehouseName: null as string | null,
      rows,
      totals: { shortfall: totalShortfall, outOfStock },
      total,
      page,
      limit,
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
    const all = batches.map((b) => {
      const exp = b.expiryDate as Date;
      const expiringDays = Math.floor(
        (exp.getTime() - today.getTime()) / 86_400_000,
      );
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
    // Full-set KPI counts (the FE cards can't be computed from a page slice).
    const expired = all.filter((r) => r.isExpired).length;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      rows,
      total,
      expired,
      expiringSoon: total - expired,
      alertDays,
      horizonDate: horizon,
      page,
      limit,
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
    const all = mv.products
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
    // Totals accumulated over the full set above; slice rows for the page.
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      rows,
      totals,
      total,
      page,
      limit,
      range: { from: q.from ?? null, to: q.to ?? null },
    };
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
      const row = byCat.get(p.categoryId) ?? {
        categoryId: p.categoryId,
        code: p.categoryCode,
        name: p.categoryName ?? '—',
        purchasedQty: D(0),
        soldQty: D(0),
        purchasedAmount: D(0),
        soldAmount: D(0),
        profit: D(0),
      };
      const pur = mv.purchase.get(p.id);
      const sal = mv.sale.get(p.id);
      row.purchasedQty = row.purchasedQty.add(pur?.qty ?? D(0));
      row.purchasedAmount = row.purchasedAmount.add(pur?.value ?? D(0));
      row.soldQty = row.soldQty.add(sal?.qty ?? D(0));
      row.soldAmount = row.soldAmount.add(sal?.value ?? D(0));
      byCat.set(p.categoryId, row);
    }
    const all = [...byCat.values()].map((r) => ({
      ...r,
      profit: r.soldAmount.sub(r.purchasedAmount),
    }));
    all.sort((a, b) => b.soldQty.comparedTo(a.soldQty));
    const totals = all.reduce(
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
    // Totals computed over the full set above; slice rows for the page.
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      rows,
      totals,
      total,
      page,
      limit,
      meta: {
        from: q.from ?? null,
        to: q.to ?? null,
        categoryId: q.categoryId ?? null,
        branchId: q.branchId ?? null,
      },
    };
  }

  /**
   * Exposure Report — per-sale imaging/radiology exposures (legacy EZHT
   * `getExposuresReport`). Lists sales that have at least one line with
   * `invExposure > 0`; each row shows the per-product exposure breakdown and the
   * sale's total exposure. (The legacy "Lab Test" column came from a clinical
   * order link that the inventory schema does not carry — it stays null.)
   */
  async exposures(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const serial = q.serial?.trim();
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
        ...(q.billerId ? { billerId: q.billerId } : {}),
        ...(q.reference
          ? { reference: { contains: q.reference, mode: 'insensitive' } }
          : {}),
        // Only sales with at least one exposed line (and, if filtering by serial,
        // a matching exposed line).
        items: {
          some: {
            invExposure: { gt: 0 },
            ...(serial
              ? { serialNo: { contains: serial, mode: 'insensitive' } }
              : {}),
          },
        },
      },
      select: {
        id: true,
        date: true,
        reference: true,
        billerName: true,
        customer: { select: { name: true } },
        items: {
          where: { invExposure: { gt: 0 } },
          select: { productName: true, invExposure: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 10000,
    });
    let grand = 0;
    const all = sales.map((s) => {
      const productExposures = s.items.map((i) => ({
        productName: i.productName,
        exposure: i.invExposure,
      }));
      const totalExposure = productExposures.reduce(
        (sum, p) => sum + p.exposure,
        0,
      );
      grand += totalExposure;
      return {
        saleId: s.id,
        date: s.date,
        reference: s.reference,
        biller: s.billerName,
        customer: s.customer?.name ?? '—',
        labTest: null as string | null,
        productExposures,
        totalExposure,
      };
    });
    // `grand` accumulated over the full set above; slice rows for the page.
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const total = all.length;
    const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      rows,
      totals: { totalExposure: grand },
      total,
      page,
      limit,
      dataGap:
        'The "Lab Test" column is not available — the inventory schema has no clinical-order link.',
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
    const stock = new Map<
      string,
      { qty: Prisma.Decimal; value: Prisma.Decimal }
    >();
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
