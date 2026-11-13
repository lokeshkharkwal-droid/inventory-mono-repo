import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * IPD (inpatient) sales reports migrated from the legacy EZHealthTrack
 * Reports.php: ipd-sales and ipd-department-sales. In the new inventory schema
 * an "IPD sale" is modelled as the stream of billable charges
 * (`InventoryIpdCharge`) booked against an admission (`InventoryIpdAdmission`),
 * so these reports roll those charges up — per admission for ipdSales, per
 * charge-category ("department") for ipdDepartmentSales. All queries are
 * tenant-scoped; money is summed with Prisma.Decimal and the ResponseInterceptor
 * converts Decimals to numbers on the way out.
 *
 * `InventoryIpdCharge` carries a plain `admissionId` FK with no Prisma relation
 * field, so the admission filters (branch, admission no) are resolved by
 * fetching the matching admissions first and joining on `admissionId` in memory.
 *
 * Where a legacy column has no source in the new Prisma schema (e.g. per-bill
 * tax/discount split, received/balance tender, a separate IPD "sale" document
 * distinct from the charge ledger), the field is returned as null/0 and flagged
 * — the report degrades gracefully rather than fabricating data.
 */
@Injectable()
export class ReportsIpdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * IPD Sales — one row per inpatient admission with the total of the billable
   * charges booked against it in the date range. `chargeCount` is the number of
   * charge lines, `grandTotal` their summed amount. Filters: date range (on the
   * charge date), branch/warehouse (on the admission branch), admission number
   * (`ipdRegNo`), charge category (`departmentName`) and free-text patient /
   * admission search. Rows are sorted by latest charge (else admission) date
   * descending.
   *
   * Data gaps (no source in the inventory schema): tax, discount, received and
   * balance amounts are 0/null — the IPD charge ledger stores only a gross
   * amount per line, not a tendered-vs-due split.
   *
   * @param tenantId the current tenant (always scoped).
   * @param q optional filters (from/to, warehouseId/branchId, ipdRegNo,
   *   departmentName, search).
   * @returns `{ rows, totals, range }` — rows of admissions with charge totals,
   *   grand totals across all rows, and the applied date range.
   */
  async ipdSales(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;

    const admissions = await this.prisma.inventoryIpdAdmission.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.ipdRegNo
          ? { admissionNo: { contains: q.ipdRegNo, mode: 'insensitive' } }
          : {}),
        ...(q.search
          ? {
              OR: [
                { patientName: { contains: q.search, mode: 'insensitive' } },
                { admissionNo: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        admissionNo: true,
        patientId: true,
        patientName: true,
        ward: true,
        bed: true,
        referringDoctor: true,
        branchId: true,
        admittedAt: true,
        dischargedAt: true,
        status: true,
      },
      orderBy: { admittedAt: 'desc' },
      take: 1000,
    });

    // Join the charge ledger in memory (no Prisma relation on admissionId).
    const admissionIds = admissions.map((a) => a.id);
    const charges = admissionIds.length
      ? await this.prisma.inventoryIpdCharge.findMany({
          where: {
            tenantId,
            deletedAt: null,
            admissionId: { in: admissionIds },
            ...(q.departmentName
              ? {
                  category: {
                    contains: q.departmentName,
                    mode: 'insensitive',
                  },
                }
              : {}),
            ...(date ? { date } : {}),
          },
          select: { admissionId: true, amount: true, date: true },
        })
      : [];

    const byAdmission = new Map<
      string,
      { amount: Prisma.Decimal; count: number; lastChargeAt: Date | null }
    >();
    for (const c of charges) {
      const e = byAdmission.get(c.admissionId) ?? {
        amount: D(0),
        count: 0,
        lastChargeAt: null as Date | null,
      };
      e.amount = e.amount.add(c.amount);
      e.count += 1;
      if (!e.lastChargeAt || c.date > e.lastChargeAt) e.lastChargeAt = c.date;
      byAdmission.set(c.admissionId, e);
    }

    let grandTotal = D(0);
    let chargeCountTotal = 0;
    const filterCharges = Boolean(date || q.departmentName);
    const rows = admissions
      // When a date / department filter is applied, keep only admissions that
      // actually have matching charges — that is the "IPD sales" set.
      .filter((a) => (filterCharges ? byAdmission.has(a.id) : true))
      .map((a) => {
        const agg = byAdmission.get(a.id);
        const amount = agg?.amount ?? D(0);
        const chargeCount = agg?.count ?? 0;
        const lastChargeAt = agg?.lastChargeAt ?? null;
        grandTotal = grandTotal.add(amount);
        chargeCountTotal += chargeCount;
        return {
          admissionId: a.id,
          admissionNo: a.admissionNo,
          patientId: a.patientId,
          patientName: a.patientName,
          ward: a.ward,
          bed: a.bed,
          referringDoctor: a.referringDoctor,
          branchId: a.branchId,
          branchName: null as string | null,
          admittedAt: a.admittedAt,
          dischargedAt: a.dischargedAt,
          status: a.status,
          lastChargeAt,
          chargeCount,
          taxAmount: D(0),
          discount: D(0),
          grandTotal: amount,
          received: null as Prisma.Decimal | null,
          balance: null as Prisma.Decimal | null,
        };
      })
      .sort((a, b) => {
        const at = a.lastChargeAt?.getTime() ?? a.admittedAt.getTime();
        const bt = b.lastChargeAt?.getTime() ?? b.admittedAt.getTime();
        return bt - at;
      });

    return {
      rows,
      totals: {
        admissions: rows.length,
        chargeCount: chargeCountTotal,
        taxAmount: D(0),
        discount: D(0),
        grandTotal,
      },
      range: { from: date?.gte ?? null, to: date?.lte ?? null },
      dataGap:
        'IPD charges store only a gross amount per line; tax/discount/received/balance have no source and are shown as 0/null.',
    };
  }

  /**
   * IPD Department Sales — the same IPD charge ledger rolled up by charge
   * category (the legacy "department"), each row carrying the number of charge
   * lines, the number of distinct admissions billed, and the summed amount.
   * Filters: date range (charge date), branch/warehouse (admission branch),
   * admission number (`ipdRegNo`) and an explicit `departmentName` / `search`
   * category filter. Rows are sorted by amount descending.
   *
   * The admission-scoped filters (branch, admission no) are resolved by first
   * fetching the matching admission ids and restricting the charge query to them
   * (the charge table has no Prisma relation to the admission).
   *
   * @param tenantId the current tenant (always scoped).
   * @param q optional filters (from/to, warehouseId/branchId, ipdRegNo,
   *   departmentName, search).
   * @returns `{ rows, totals, range }` — one row per department (charge
   *   category) with charge/admission counts and amount, grand totals, and the
   *   applied date range.
   */
  async ipdDepartmentSales(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const categoryFilter = q.departmentName ?? q.search;

    // Resolve the admission scope first when a branch / admission-no filter is
    // present; otherwise charges across all of the tenant's admissions qualify.
    const scopeAdmissions = Boolean(branchId || q.ipdRegNo);
    let admissionIds: string[] | null = null;
    if (scopeAdmissions) {
      const admissions = await this.prisma.inventoryIpdAdmission.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(branchId ? { branchId } : {}),
          ...(q.ipdRegNo
            ? { admissionNo: { contains: q.ipdRegNo, mode: 'insensitive' } }
            : {}),
        },
        select: { id: true },
        take: 1000,
      });
      admissionIds = admissions.map((a) => a.id);
    }

    const charges =
      admissionIds && admissionIds.length === 0
        ? []
        : await this.prisma.inventoryIpdCharge.findMany({
            where: {
              tenantId,
              deletedAt: null,
              ...(date ? { date } : {}),
              ...(categoryFilter
                ? {
                    category: {
                      contains: categoryFilter,
                      mode: 'insensitive',
                    },
                  }
                : {}),
              ...(admissionIds ? { admissionId: { in: admissionIds } } : {}),
            },
            select: { admissionId: true, category: true, amount: true },
            take: 1000,
          });

    type Row = {
      department: string;
      chargeCount: number;
      admissionIds: Set<string>;
      amount: Prisma.Decimal;
    };
    const byDept = new Map<string, Row>();
    let grandTotal = D(0);
    for (const c of charges) {
      const key = c.category ?? 'Uncategorised';
      const row = byDept.get(key) ?? {
        department: key,
        chargeCount: 0,
        admissionIds: new Set<string>(),
        amount: D(0),
      };
      row.chargeCount += 1;
      row.admissionIds.add(c.admissionId);
      row.amount = row.amount.add(c.amount);
      byDept.set(key, row);
      grandTotal = grandTotal.add(c.amount);
    }

    const rows = [...byDept.values()]
      .map((r) => ({
        department: r.department,
        chargeCount: r.chargeCount,
        admissionCount: r.admissionIds.size,
        amount: r.amount,
      }))
      .sort((a, b) => b.amount.comparedTo(a.amount));

    return {
      rows,
      totals: {
        departments: rows.length,
        chargeCount: rows.reduce((s, r) => s + r.chargeCount, 0),
        amount: grandTotal,
      },
      range: { from: date?.gte ?? null, to: date?.lte ?? null },
    };
  }
}
