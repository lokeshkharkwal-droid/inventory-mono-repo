import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * Purchase reports migrated from the legacy EZHealthTrack Reports.php:
 * daily-purchases, monthly-purchases, purchases, purchase-age, purchases-tax.
 * All queries are tenant-scoped (`tenantId` + `deletedAt: null`) and optionally
 * branch/warehouse-scoped via `q.warehouseId ?? q.branchId`; money/qty are summed
 * with Prisma.Decimal and the ResponseInterceptor converts Decimals to numbers.
 *
 * Several legacy columns have no source in the new Prisma schema and are returned
 * as `null`/`0` rather than fabricated:
 *  - `product_tax` — `InventoryPurchase` has only `orderTax` (one combined order
 *    tax); the line-level product-tax total is derived as Σ(items.taxAmount).
 *  - `igst`/`cgst`/`sgst` — no place-of-supply is captured, so the GST split is
 *    DERIVED intra-state (CGST = SGST = productTax / 2, IGST = 0), clearly flagged.
 *  - warehouse NAME — `Inventory*` models store only `branchId`; the name must be
 *    resolved from the kalnostics Branch API, so `warehouseName` is returned null.
 *  - purchase-age `quantityBalance`/`serialNo` — no remaining-balance field exists
 *    on `InventoryPurchaseItem`; `batchNo`/`expiryDate` DO exist and are surfaced.
 */
@Injectable()
export class ReportsPurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily Purchases — a month-at-a-glance calendar: one bucket per day-of-month
   * with that day's summed discount, shipping, order tax and grand total for one
   * warehouse/branch (or all), optionally scoped to one staff member's purchases.
   * `productTax` is returned null (no per-product tax aggregate on the model).
   *
   * @param tenantId tenant from the JWT (never client-supplied).
   * @param q reads `year`/`month` (default current), `warehouseId`/`branchId`, `createdBy`.
   * @returns `{ year, month, branchId, days: [...], totals }` — `days` holds only
   *   days that had purchases; the frontend fills blank calendar cells.
   */
  async dailyPurchases(tenantId: string, q: ReportQueryDto) {
    const now = new Date();
    const year = q.year ?? now.getUTCFullYear();
    const month = q.month ?? now.getUTCMonth() + 1;
    const branchId = q.warehouseId ?? q.branchId;
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const purchases = await this.prisma.inventoryPurchase.findMany({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
        ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      },
      select: {
        date: true,
        orderDiscount: true,
        shipping: true,
        orderTax: true,
        grandTotal: true,
      },
      take: 1000,
    });

    type DayBucket = {
      day: number;
      date: string;
      discount: Prisma.Decimal;
      shipping: Prisma.Decimal;
      orderTax: Prisma.Decimal;
      grandTotal: Prisma.Decimal;
      productTax: null;
    };
    const byDay = new Map<number, DayBucket>();
    const totals = {
      discount: D(0),
      shipping: D(0),
      orderTax: D(0),
      grandTotal: D(0),
      productTax: null,
    };
    for (const p of purchases) {
      const day = p.date.getUTCDate();
      const bucket = byDay.get(day) ?? {
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        discount: D(0),
        shipping: D(0),
        orderTax: D(0),
        grandTotal: D(0),
        productTax: null,
      };
      bucket.discount = bucket.discount.add(p.orderDiscount);
      bucket.shipping = bucket.shipping.add(p.shipping);
      bucket.orderTax = bucket.orderTax.add(p.orderTax);
      bucket.grandTotal = bucket.grandTotal.add(p.grandTotal);
      byDay.set(day, bucket);
      totals.discount = totals.discount.add(p.orderDiscount);
      totals.shipping = totals.shipping.add(p.shipping);
      totals.orderTax = totals.orderTax.add(p.orderTax);
      totals.grandTotal = totals.grandTotal.add(p.grandTotal);
    }

    // Zero-fill every day of the month so the grid is a full calendar (parity
    // with dailySales and the legacy daily-purchases report).
    const daysInMonth = end.getUTCDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return (
        byDay.get(day) ?? {
          day,
          date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          discount: D(0),
          shipping: D(0),
          orderTax: D(0),
          grandTotal: D(0),
          productTax: null,
        }
      );
    });
    return { year, month, branchId: branchId ?? null, days, totals };
  }

  /**
   * Monthly Purchases — a year-at-a-glance calendar: always 12 zero-filled month
   * buckets (Jan–Dec) with each month's summed discount, shipping, order tax and
   * grand total for one warehouse/branch (or all), optionally scoped to one staff
   * member. `productTax` is 0 (no per-product tax aggregate on the model).
   *
   * @param tenantId tenant from the JWT.
   * @param q reads `year` (default current), `warehouseId`/`branchId`, `createdBy`.
   * @returns `{ year, warehouseId, months: [...12], yearTotal }` — all 12 months
   *   are returned (zero-filled) so the frontend grid needs no gap-filling.
   */
  async monthlyPurchases(tenantId: string, q: ReportQueryDto) {
    const year = q.year ?? new Date().getUTCFullYear();
    const branchId = q.warehouseId ?? q.branchId;
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const purchases = await this.prisma.inventoryPurchase.findMany({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
        ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      },
      select: {
        date: true,
        orderDiscount: true,
        shipping: true,
        orderTax: true,
        grandTotal: true,
      },
      take: 1000,
    });

    const labels = [
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
    const months = labels.map((label, i) => ({
      month: i + 1,
      label,
      discount: D(0),
      shipping: D(0),
      productTax: D(0),
      orderTax: D(0),
      total: D(0),
    }));
    const yearTotal = {
      discount: D(0),
      shipping: D(0),
      productTax: D(0),
      orderTax: D(0),
      total: D(0),
    };
    for (const p of purchases) {
      const m = months[p.date.getUTCMonth()];
      if (!m) continue;
      m.discount = m.discount.add(p.orderDiscount);
      m.shipping = m.shipping.add(p.shipping);
      m.orderTax = m.orderTax.add(p.orderTax);
      m.total = m.total.add(p.grandTotal);
      yearTotal.discount = yearTotal.discount.add(p.orderDiscount);
      yearTotal.shipping = yearTotal.shipping.add(p.shipping);
      yearTotal.orderTax = yearTotal.orderTax.add(p.orderTax);
      yearTotal.total = yearTotal.total.add(p.grandTotal);
    }

    return { year, warehouseId: branchId ?? null, months, yearTotal };
  }

  /**
   * Purchases — detailed per-purchase listing (one row per purchase) with each
   * purchase's line items, grand total, paid and derived balance. Filterable by
   * reference, supplier, warehouse, staff, product and date range. Footer totals
   * (grandTotal/paid/balance) are computed over the FULL filtered set.
   *
   * @param tenantId tenant from the JWT.
   * @param q reads `from`/`to`, `supplierId`, `warehouseId`/`branchId`, `createdBy`,
   *   `productId`, `reference` (partial), `status`, `page`, `limit`.
   * @returns `{ rows, totals, page, limit, total }`. `warehouseName` is null
   *   (resolved from the Branch API, not stored on the model).
   */
  async purchases(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;

    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.supplierId ? { supplierId: q.supplierId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.productId ? { items: { some: { productId: q.productId } } } : {}),
    };

    const [total, agg, purchases] = await Promise.all([
      this.prisma.inventoryPurchase.count({ where }),
      this.prisma.inventoryPurchase.aggregate({
        where,
        _sum: { grandTotal: true, paid: true },
      }),
      this.prisma.inventoryPurchase.findMany({
        where,
        include: {
          supplier: { select: { name: true } },
          items: { select: { productName: true, quantity: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const rows = purchases.map((p) => ({
      id: p.id,
      date: p.date,
      reference: p.reference,
      branchId: p.branchId,
      warehouseName: null as string | null,
      supplierId: p.supplierId,
      supplierName: p.supplier?.name ?? '—',
      items: p.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
      })),
      grandTotal: p.grandTotal,
      paid: p.paid,
      balance: p.grandTotal.sub(p.paid),
      status: p.status,
      createdBy: p.createdBy,
      isUnpaid: p.paid.isZero(),
    }));

    const grandTotal = agg._sum.grandTotal ?? D(0);
    const paid = agg._sum.paid ?? D(0);
    return {
      rows,
      totals: { grandTotal, paid, balance: grandTotal.sub(paid) },
      page,
      limit,
      total,
    };
  }

  /**
   * Purchase Age — purchase register with a computed aging column: days elapsed
   * since each purchase's date. Each row carries its line items (productName +
   * quantity), plus best-effort `batchNo`/`expiryDate` from the first item.
   * `quantityBalance`/`serialNo` have no source in the schema and return null.
   *
   * @param tenantId tenant from the JWT.
   * @param q reads `from`/`to`, `reference` (partial), `createdBy`, `supplierId`,
   *   `warehouseId`/`branchId`, `productId`, `page`, `limit`.
   * @returns `{ rows, total, page, limit }`. Sorted by purchase date desc.
   */
  async purchaseAge(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;

    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.supplierId ? { supplierId: q.supplierId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.productId ? { items: { some: { productId: q.productId } } } : {}),
    };

    const [total, purchases] = await Promise.all([
      this.prisma.inventoryPurchase.count({ where }),
      this.prisma.inventoryPurchase.findMany({
        where,
        include: {
          items: {
            select: {
              productName: true,
              quantity: true,
              batchNo: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const now = Date.now();
    const rows = purchases.map((p) => {
      const first = p.items[0];
      const purchaseAgeDays = Math.floor((now - p.date.getTime()) / 86_400_000);
      return {
        id: p.id,
        date: p.date,
        referenceNo: p.reference,
        branchId: p.branchId,
        warehouseName: null as string | null,
        products: p.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        quantityBalance: null as Prisma.Decimal | null,
        serialNo: null as string | null,
        batchNo: first?.batchNo ?? null,
        expiry: first?.expiryDate ?? null,
        purchaseAgeDays,
        status: p.status,
      };
    });

    return { rows, total, page, limit };
  }

  /**
   * Purchases Tax — per-purchase input-GST listing: one row per purchase with its
   * line items, grand total, total product tax (Σ items.taxAmount, falling back
   * to the purchase `orderTax`) and a DERIVED intra-state GST split
   * (CGST = SGST = productTax / 2, IGST = 0 — no place-of-supply is captured).
   * Footer totals sum grandTotal/productTax/igst/cgst/sgst over the filtered set.
   *
   * @param tenantId tenant from the JWT.
   * @param q reads `from`/`to`, `reference` (partial), `supplierId`,
   *   `warehouseId`/`branchId`, `createdBy`, `productId`, `status`, `page`, `limit`.
   *   (`q.search` is matched against item `batchNo` as the legacy Batch/Serial filter.)
   * @returns `{ rows, totals, page, limit, total }`. `igst`/`cgst`/`sgst` are derived.
   */
  async purchasesTax(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const page = q.page && q.page > 0 ? q.page : 1;
    const limit = q.limit && q.limit > 0 ? q.limit : 25;
    const batchNo = q.search;

    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.supplierId ? { supplierId: q.supplierId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.productId || batchNo
        ? {
            items: {
              some: {
                ...(q.productId ? { productId: q.productId } : {}),
                ...(batchNo
                  ? { batchNo: { contains: batchNo, mode: 'insensitive' } }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [total, purchases] = await Promise.all([
      this.prisma.inventoryPurchase.count({ where }),
      this.prisma.inventoryPurchase.findMany({
        where,
        include: {
          supplier: { select: { name: true } },
          items: {
            select: { productName: true, quantity: true, taxAmount: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totals = {
      grandTotal: D(0),
      productTax: D(0),
      igst: D(0),
      cgst: D(0),
      sgst: D(0),
    };
    const rows = purchases.map((p) => {
      const itemTax = p.items.reduce((s, i) => s.add(i.taxAmount), D(0));
      const productTax = itemTax.isZero() ? p.orderTax : itemTax;
      // Derived intra-state split: no place-of-supply is captured, so CGST = SGST
      // = half the product tax and IGST = 0. Clearly flagged as derived.
      const half = productTax.div(2);
      const cgst = half;
      const sgst = productTax.sub(half);
      const igst = D(0);
      totals.grandTotal = totals.grandTotal.add(p.grandTotal);
      totals.productTax = totals.productTax.add(productTax);
      totals.cgst = totals.cgst.add(cgst);
      totals.sgst = totals.sgst.add(sgst);
      totals.igst = totals.igst.add(igst);
      return {
        id: p.id,
        date: p.date,
        reference: p.reference,
        branchId: p.branchId,
        warehouse: null as string | null,
        supplierId: p.supplierId,
        supplier: p.supplier?.name ?? '—',
        items: p.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        grandTotal: p.grandTotal,
        productTax,
        igst,
        cgst,
        sgst,
      };
    });

    return {
      rows,
      totals,
      page,
      limit,
      total,
      dataGap:
        'IGST/CGST/SGST are DERIVED intra-state (CGST=SGST=productTax/2, IGST=0); no place-of-supply or GST split is stored on InventoryPurchase.',
    };
  }
}
