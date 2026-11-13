import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * Party / people reports migrated from the legacy EZHealthTrack Reports.php:
 * customers, patients, suppliers, supplier-credit and users (staff). All queries
 * are tenant-scoped; money/qty are summed with Prisma.Decimal and the
 * ResponseInterceptor converts Decimals to numbers on the way out.
 *
 * Where a legacy column has no source in the new Prisma schema (e.g. a staff
 * person's name/email/company/group — `createdBy` is only an opaque person-id
 * here — or a local warehouse/branch name — `branchId` is an external kalnostics
 * reference), the field is returned as null and flagged via a `dataGap` note;
 * the report degrades gracefully rather than fabricating data.
 */
@Injectable()
export class ReportsPartiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Customers Report — every customer that has at least one sale, with their
   * contact identity and lifetime sales activity: number of sales, total billed
   * (Σ grandTotal), total paid (Σ paid) and outstanding balance (billed − paid).
   * Legacy INNER JOIN semantics preserved: customers with zero sales are omitted.
   * Scoped by tenant; the legacy page carried no date/branch filter, so neither
   * does this (free-text `search` across company/name/phone/email is honoured).
   *
   * @param tenantId current tenant (JWT context)
   * @param q report query; reads `search` only (no date/branch filter)
   * @returns `{ rows, totals }` — totals are the grand totals over the full set
   */
  async customers(tenantId: string, q: ReportQueryDto) {
    const agg = await this.prisma.inventorySale.groupBy({
      by: ['customerId'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
      _sum: { grandTotal: true, paid: true },
    });
    const byCustomer = new Map(agg.map((a) => [a.customerId, a]));
    const ids = agg.map((a) => a.customerId);
    if (ids.length === 0) {
      return { rows: [], totals: this.zeroPartyTotals('totalSales') };
    }

    const customers = await this.prisma.inventoryCustomer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { in: ids },
        // Walk-in customers = not linked to a kalnostics patient.
        patientId: null,
        ...(q.search
          ? {
              OR: [
                { companyName: { contains: q.search, mode: 'insensitive' } },
                { name: { contains: q.search, mode: 'insensitive' } },
                { phone: { contains: q.search, mode: 'insensitive' } },
                { email: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        companyName: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: [{ companyName: 'asc' }, { name: 'asc' }],
      take: 1000,
    });

    const totals = this.zeroPartyTotals('totalSales');
    const rows = customers.map((c) => {
      const a = byCustomer.get(c.id);
      const totalSales = a?._count._all ?? 0;
      const totalAmount = a?._sum.grandTotal ?? D(0);
      const paid = a?._sum.paid ?? D(0);
      const balance = totalAmount.sub(paid);
      totals.totalSales += totalSales;
      totals.totalAmount = totals.totalAmount.add(totalAmount);
      totals.paid = totals.paid.add(paid);
      totals.balance = totals.balance.add(balance);
      return {
        customerId: c.id,
        company: c.companyName,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalSales,
        totalAmount,
        paid,
        balance,
      };
    });
    return { rows, totals };
  }

  /**
   * Patients Report — identical sales-activity rollup to `customers`, but keyed
   * on the patient code and scoped to the active branch when one is supplied
   * (`warehouseId ?? branchId` → `InventorySale.branchId`). Per-column text
   * filters (code/name/phone/email) are honoured via `search`. INNER-join
   * semantics: only customers with at least one in-scope sale appear.
   *
   * @param tenantId current tenant (JWT context)
   * @param q report query; reads `warehouseId`/`branchId` and `search`
   * @returns `{ rows, totals }` — grand totals over the full filtered set
   */
  async patients(tenantId: string, q: ReportQueryDto) {
    const branchId = q.warehouseId ?? q.branchId;
    const agg = await this.prisma.inventorySale.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      _count: { _all: true },
      _sum: { grandTotal: true, paid: true },
    });
    const byCustomer = new Map(agg.map((a) => [a.customerId, a]));
    const ids = agg.map((a) => a.customerId);
    if (ids.length === 0) {
      return {
        rows: [],
        totals: this.zeroPartyTotals('totalSales'),
        branchId: branchId ?? null,
      };
    }

    const customers = await this.prisma.inventoryCustomer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { in: ids },
        // Patients = customers linked to a kalnostics patient record.
        patientId: { not: null },
        ...(q.search
          ? {
              OR: [
                { code: { contains: q.search, mode: 'insensitive' } },
                { name: { contains: q.search, mode: 'insensitive' } },
                { phone: { contains: q.search, mode: 'insensitive' } },
                { email: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      take: 1000,
    });

    const totals = this.zeroPartyTotals('totalSales');
    const rows = customers.map((c) => {
      const a = byCustomer.get(c.id);
      const totalSales = a?._count._all ?? 0;
      const totalAmount = a?._sum.grandTotal ?? D(0);
      const paid = a?._sum.paid ?? D(0);
      const balance = totalAmount.sub(paid);
      totals.totalSales += totalSales;
      totals.totalAmount = totals.totalAmount.add(totalAmount);
      totals.paid = totals.paid.add(paid);
      totals.balance = totals.balance.add(balance);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalSales,
        totalAmount,
        paid,
        balance,
      };
    });
    return { rows, totals, branchId: branchId ?? null };
  }

  /**
   * Suppliers Report — every supplier the tenant has purchased from, with their
   * contact identity and lifetime purchase totals: number of purchases, total
   * billed (Σ grandTotal), total paid (Σ paid) and outstanding balance owed
   * (billed − paid). INNER-join semantics preserved (zero-purchase suppliers are
   * omitted). All-time by design; optional branch scope via `warehouseId ?? branchId`.
   *
   * @param tenantId current tenant (JWT context)
   * @param q report query; reads `warehouseId`/`branchId` and `search`
   * @returns `{ rows, totals }` — grand totals over the full filtered set
   */
  async suppliers(tenantId: string, q: ReportQueryDto) {
    const branchId = q.warehouseId ?? q.branchId;
    const agg = await this.prisma.inventoryPurchase.groupBy({
      by: ['supplierId'],
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      _count: { _all: true },
      _sum: { grandTotal: true, paid: true },
    });
    const bySupplier = new Map(agg.map((a) => [a.supplierId, a]));
    const ids = agg.map((a) => a.supplierId);
    if (ids.length === 0) {
      return { rows: [], totals: this.zeroPartyTotals('totalPurchases') };
    }

    const suppliers = await this.prisma.inventorySupplier.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { in: ids },
        ...(q.search
          ? {
              OR: [
                { companyName: { contains: q.search, mode: 'insensitive' } },
                { name: { contains: q.search, mode: 'insensitive' } },
                { phone: { contains: q.search, mode: 'insensitive' } },
                { email: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        companyName: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: [{ name: 'asc' }, { companyName: 'asc' }],
      take: 1000,
    });

    const totals = this.zeroPartyTotals('totalPurchases');
    const rows = suppliers.map((s) => {
      const a = bySupplier.get(s.id);
      const totalPurchases = a?._count._all ?? 0;
      const totalAmount = a?._sum.grandTotal ?? D(0);
      const paid = a?._sum.paid ?? D(0);
      const balance = totalAmount.sub(paid);
      totals.totalPurchases += totalPurchases;
      totals.totalAmount = totals.totalAmount.add(totalAmount);
      totals.paid = totals.paid.add(paid);
      totals.balance = totals.balance.add(balance);
      return {
        supplierId: s.id,
        company: s.companyName,
        name: s.name,
        phone: s.phone,
        email: s.email,
        totalPurchases,
        totalAmount,
        paid,
        balance,
      };
    });
    return { rows, totals };
  }

  /**
   * Supplier Credit Report — one row per purchase/PO with amount billed, paid and
   * outstanding balance (billed − paid), i.e. a per-invoice accounts-payable list.
   * Filterable by supplier, branch (`warehouseId ?? branchId`), date range,
   * `status` and `paymentStatus`; non-admin staff scoping maps to `createdBy`.
   * Sorted by date desc; `totals` sum billed/paid/balance over the full set.
   *
   * @param tenantId current tenant (JWT context)
   * @param q report query; reads from/to, supplier/branch/status/createdBy
   * @returns `{ rows, totals, dataGap }` — warehouseName is null (external branch)
   */
  async supplierCredit(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const purchases = await this.prisma.inventoryPurchase.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(date ? { date } : {}),
        ...(q.supplierId ? { supplierId: q.supplierId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
        ...(q.createdBy ? { createdBy: q.createdBy } : {}),
        ...(q.reference
          ? { reference: { contains: q.reference, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        date: true,
        reference: true,
        branchId: true,
        supplierId: true,
        grandTotal: true,
        paid: true,
        status: true,
        paymentStatus: true,
        supplier: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const totals = { grandTotal: D(0), paid: D(0), balance: D(0) };
    const rows = purchases.map((p) => {
      const balance = p.grandTotal.sub(p.paid);
      totals.grandTotal = totals.grandTotal.add(p.grandTotal);
      totals.paid = totals.paid.add(p.paid);
      totals.balance = totals.balance.add(balance);
      return {
        purchaseId: p.id,
        date: p.date,
        reference: p.reference,
        branchId: p.branchId,
        warehouseName: null as string | null,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name ?? '—',
        grandTotal: p.grandTotal,
        paid: p.paid,
        balance,
        status: p.status,
        paymentStatus: p.paymentStatus,
      };
    });
    return {
      rows,
      totals,
      dataGap:
        'Warehouse/branch name is an external kalnostics reference; only branchId is available locally, so warehouseName is null.',
    };
  }

  /**
   * Users (Staff) Report — one row per staff member who created any sale or
   * purchase, with their sales/purchases volume (count, Σ grandTotal, Σ paid) as
   * the record creator. `createdBy` is the only identity the inventory schema
   * carries (an opaque person-id); first/last name, email, company, group and
   * active status live on the auth Person/RBAC layer, not here — so those fields
   * are returned null and flagged. Sorted by sales total desc.
   *
   * @param tenantId current tenant (JWT context)
   * @param q report query; reads from/to and `warehouseId`/`branchId`
   * @returns `{ rows, totals, dataGap }` — identity fields null (not in schema)
   */
  async users(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const saleWhere: Prisma.InventorySaleWhereInput = {
      tenantId,
      deletedAt: null,
      createdBy: { not: null },
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
    };
    const purchaseWhere: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
      createdBy: { not: null },
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
    };
    const [saleAgg, purchaseAgg] = await Promise.all([
      this.prisma.inventorySale.groupBy({
        by: ['createdBy'],
        where: saleWhere,
        _count: { _all: true },
        _sum: { grandTotal: true, paid: true },
      }),
      this.prisma.inventoryPurchase.groupBy({
        by: ['createdBy'],
        where: purchaseWhere,
        _count: { _all: true },
        _sum: { grandTotal: true, paid: true },
      }),
    ]);

    type StaffRow = {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      salesCount: number;
      salesTotal: Prisma.Decimal;
      salesPaid: Prisma.Decimal;
      purchasesCount: number;
      purchasesTotal: Prisma.Decimal;
      purchasesPaid: Prisma.Decimal;
    };
    const byUser = new Map<string, StaffRow>();
    const blank = (userId: string): StaffRow => ({
      userId,
      firstName: null,
      lastName: null,
      email: null,
      salesCount: 0,
      salesTotal: D(0),
      salesPaid: D(0),
      purchasesCount: 0,
      purchasesTotal: D(0),
      purchasesPaid: D(0),
    });

    for (const a of saleAgg) {
      if (a.createdBy == null) continue;
      const row = byUser.get(a.createdBy) ?? blank(a.createdBy);
      row.salesCount = a._count._all;
      row.salesTotal = a._sum.grandTotal ?? D(0);
      row.salesPaid = a._sum.paid ?? D(0);
      byUser.set(a.createdBy, row);
    }
    for (const a of purchaseAgg) {
      if (a.createdBy == null) continue;
      const row = byUser.get(a.createdBy) ?? blank(a.createdBy);
      row.purchasesCount = a._count._all;
      row.purchasesTotal = a._sum.grandTotal ?? D(0);
      row.purchasesPaid = a._sum.paid ?? D(0);
      byUser.set(a.createdBy, row);
    }

    const rows = [...byUser.values()];
    rows.sort((x, y) => y.salesTotal.comparedTo(x.salesTotal));

    const totals = {
      salesCount: 0,
      salesTotal: D(0),
      salesPaid: D(0),
      purchasesCount: 0,
      purchasesTotal: D(0),
      purchasesPaid: D(0),
    };
    for (const r of rows) {
      totals.salesCount += r.salesCount;
      totals.salesTotal = totals.salesTotal.add(r.salesTotal);
      totals.salesPaid = totals.salesPaid.add(r.salesPaid);
      totals.purchasesCount += r.purchasesCount;
      totals.purchasesTotal = totals.purchasesTotal.add(r.purchasesTotal);
      totals.purchasesPaid = totals.purchasesPaid.add(r.purchasesPaid);
    }

    return {
      rows,
      totals,
      dataGap:
        'Staff identity (firstName/lastName/email) and legacy company/group/status live on the auth Person/RBAC layer, not on inventory models; createdBy is the only person-id available, so identity fields are null.',
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Zero party-aggregate totals; `countKey` names the integer count field. */
  private zeroPartyTotals<K extends 'totalSales' | 'totalPurchases'>(
    countKey: K,
  ): { [P in K]: number } & {
    totalAmount: Prisma.Decimal;
    paid: Prisma.Decimal;
    balance: Prisma.Decimal;
  } {
    return {
      [countKey]: 0,
      totalAmount: D(0),
      paid: D(0),
      balance: D(0),
    } as { [P in K]: number } & {
      totalAmount: Prisma.Decimal;
      paid: Prisma.Decimal;
      balance: Prisma.Decimal;
    };
  }
}
