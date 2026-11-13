import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { D, dateFilter } from './report-utils';
import { ReportQueryDto } from './dto/reports-query.dto';

/**
 * Finance / ledger reports migrated from the legacy EZHealthTrack Reports.php:
 * transfers, expenses, incomes and the merged income-vs-expense ledger. All
 * queries are tenant-scoped (and branch-scoped when a warehouse/branch is given);
 * money is summed with Prisma.Decimal and the ResponseInterceptor converts
 * Decimals to numbers on the way out.
 *
 * Where a legacy column has no source in the new Prisma schema (transfer money
 * totals, the per-expense/income GST breakdown, attachments, serial-no filters),
 * the field is returned as null/0 and flagged via a `dataGap` note — the report
 * degrades gracefully rather than fabricating data. `createdBy` holds the staff
 * person-id (an opaque string; there is no user table to resolve a display name).
 */
@Injectable()
export class ReportsFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transfers Report — inter-branch stock movements over a date range, one row
   * per transfer, with the from/to locations, the product+quantity line list and
   * money totals. `InventoryTransfer` has no total/tax/shipping/grandTotal
   * columns, so Total is derived as Σ(item.quantity × item.cost), Total Tax and
   * Shipping are 0 and Grand Total equals Total (flagged in `dataGap`). Branch
   * names are not stored on the transfer and there is no branch entity, so
   * fromWarehouse/toWarehouse resolve to null. Sorted by date desc, capped at 1000.
   *
   * @param tenantId tenant from JWT context (never the request body)
   * @param q report query filters (from/to, reference, createdBy, warehouseId,
   *   categoryId, productId)
   * @returns `{ rows, totals, dataGap }` — rows carry derived money totals
   */
  async transfers(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const where: Prisma.InventoryTransferWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { fromBranchId: branchId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.categoryId || q.productId
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

    const transfers = await this.prisma.inventoryTransfer.findMany({
      where,
      select: {
        id: true,
        date: true,
        reference: true,
        fromBranchId: true,
        toBranchId: true,
        status: true,
        items: { select: { productName: true, quantity: true, cost: true } },
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const totals = {
      total: D(0),
      totalTax: D(0),
      shipping: D(0),
      grandTotal: D(0),
    };
    const rows = transfers.map((t) => {
      const total = t.items.reduce(
        (s, i) => s.add(i.quantity.mul(i.cost)),
        D(0),
      );
      totals.total = totals.total.add(total);
      totals.grandTotal = totals.grandTotal.add(total);
      return {
        id: t.id,
        date: t.date,
        reference: t.reference,
        fromBranchId: t.fromBranchId,
        toBranchId: t.toBranchId,
        fromWarehouse: null as string | null,
        toWarehouse: null as string | null,
        items: t.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        total,
        totalTax: D(0),
        shipping: D(0),
        grandTotal: total,
        status: t.status,
      };
    });

    return {
      rows,
      totals,
      dataGap:
        'InventoryTransfer has no total/tax/shipping/grandTotal columns — Total is derived as Σ(quantity × cost), Total Tax and Shipping are 0, Grand Total equals Total. Branch names and the serial-no filter are not modelled, so fromWarehouse/toWarehouse are null and serial filtering is unavailable.',
    };
  }

  /**
   * Expenses Report — individual expense entries (reference, category, amount,
   * note) over a date range. The new `InventoryExpense` carries only a single
   * `amount` Decimal, so the legacy GST breakdown (igst/cgst/sgst/totalTax/
   * grandTotal) and attachment column collapse into one Amount (flagged). Sorted
   * by date desc, capped at 1000.
   *
   * @param tenantId tenant from JWT context
   * @param q report query filters (from/to, reference, categoryId, note,
   *   createdBy, warehouseId/branchId)
   * @returns `{ rows, totals, from, to, dataGap }`
   */
  async expenses(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const where: Prisma.InventoryExpenseWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.search
        ? { note: { contains: q.search, mode: 'insensitive' } }
        : {}),
    };

    const expenses = await this.prisma.inventoryExpense.findMany({
      where,
      select: {
        id: true,
        date: true,
        reference: true,
        amount: true,
        note: true,
        categoryId: true,
        createdBy: true,
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const categoryNames = await this.categoryNameMap(
      tenantId,
      'expense',
      expenses.map((e) => e.categoryId),
    );

    let amount = D(0);
    const rows = expenses.map((e) => {
      amount = amount.add(e.amount);
      return {
        id: e.id,
        date: e.date,
        reference: e.reference,
        categoryId: e.categoryId,
        category: e.categoryId ? (categoryNames.get(e.categoryId) ?? '—') : '—',
        amount: e.amount,
        note: e.note,
        createdBy: e.createdBy,
      };
    });

    return {
      rows,
      totals: { amount },
      from: date?.gte ?? null,
      to: date?.lte ?? null,
      dataGap:
        'InventoryExpense has only a single amount Decimal — the legacy igst/cgst/sgst/totalTax/grandTotal breakdown and attachment are not modelled, so only Amount is returned. createdBy is the opaque staff person-id (no user table to resolve a name).',
    };
  }

  /**
   * Incomes Report — standalone (non-sale) income entries (interest, rent, misc
   * receipts) recorded against income categories, over a date range. Like
   * expenses, the new `InventoryIncome` is flattened to a single `amount`, so the
   * legacy tax columns and attachment collapse into one Amount (flagged). Sorted
   * by date desc, capped at 1000.
   *
   * @param tenantId tenant from JWT context
   * @param q report query filters (from/to, reference, categoryId, note,
   *   createdBy, warehouseId/branchId)
   * @returns `{ rows, totals, from, to, dataGap }`
   */
  async incomes(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    const where: Prisma.InventoryIncomeWhereInput = {
      tenantId,
      deletedAt: null,
      ...(date ? { date } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.createdBy ? { createdBy: q.createdBy } : {}),
      ...(q.reference
        ? { reference: { contains: q.reference, mode: 'insensitive' } }
        : {}),
      ...(q.search
        ? { note: { contains: q.search, mode: 'insensitive' } }
        : {}),
    };

    const incomes = await this.prisma.inventoryIncome.findMany({
      where,
      select: {
        id: true,
        date: true,
        reference: true,
        amount: true,
        note: true,
        categoryId: true,
        createdBy: true,
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const categoryNames = await this.categoryNameMap(
      tenantId,
      'income',
      incomes.map((i) => i.categoryId),
    );

    let amount = D(0);
    const rows = incomes.map((i) => {
      amount = amount.add(i.amount);
      return {
        id: i.id,
        date: i.date,
        reference: i.reference,
        categoryId: i.categoryId,
        category: i.categoryId ? (categoryNames.get(i.categoryId) ?? '—') : '—',
        amount: i.amount,
        note: i.note,
        createdBy: i.createdBy,
      };
    });

    return {
      rows,
      totals: { amount },
      from: date?.gte ?? null,
      to: date?.lte ?? null,
      dataGap:
        'InventoryIncome has only a single amount Decimal — the legacy igst/cgst/sgst/totalTax/grandTotal breakdown and attachment are not modelled, so only Amount is returned. createdBy is the opaque staff person-id (no user table to resolve a name).',
    };
  }

  /**
   * Income vs Expense Report — a unified chronological ledger merging standalone
   * incomes (positive) and standalone expenses (negated) into one list for a date
   * range, with net = income − expense. Income and expense category filters each
   * narrow only their own half; reference/note are matched against the merged set;
   * the date range applies to both halves. Rows are fetched in parallel, mapped to
   * a shared signed-amount shape, sorted by date desc and capped at 1000 total.
   *
   * @param tenantId tenant from JWT context
   * @param q report query filters (from/to, categoryId → income half,
   *   subCategoryId → expense half, reference, note/search, warehouseId/branchId)
   * @returns `{ rows, totals: { income, expense, net }, from, to, dataGap }`
   */
  async incomeExpense(tenantId: string, q: ReportQueryDto) {
    const date = dateFilter(q.from, q.to);
    const branchId = q.warehouseId ?? q.branchId;
    // Income category filter rides on categoryId; expense category filter rides
    // on subCategoryId (reusing the superset DTO so the controller stays terse).
    const incomeCategoryId = q.categoryId;
    const expenseCategoryId = q.subCategoryId;

    const [incomes, expenses] = await Promise.all([
      this.prisma.inventoryIncome.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(date ? { date } : {}),
          ...(branchId ? { branchId } : {}),
          ...(incomeCategoryId ? { categoryId: incomeCategoryId } : {}),
        },
        select: {
          id: true,
          date: true,
          reference: true,
          amount: true,
          note: true,
          categoryId: true,
        },
        take: 1000,
      }),
      this.prisma.inventoryExpense.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(date ? { date } : {}),
          ...(branchId ? { branchId } : {}),
          ...(expenseCategoryId ? { categoryId: expenseCategoryId } : {}),
        },
        select: {
          id: true,
          date: true,
          reference: true,
          amount: true,
          note: true,
          categoryId: true,
        },
        take: 1000,
      }),
    ]);

    const [incomeCats, expenseCats] = await Promise.all([
      this.categoryNameMap(
        tenantId,
        'income',
        incomes.map((i) => i.categoryId),
      ),
      this.categoryNameMap(
        tenantId,
        'expense',
        expenses.map((e) => e.categoryId),
      ),
    ]);

    type Row = {
      id: string;
      date: Date;
      type: 'Income' | 'Expense';
      reference: string;
      categoryId: string | null;
      category: string;
      amount: Prisma.Decimal;
      note: string | null;
    };

    let income = D(0);
    let expense = D(0);
    let rows: Row[] = [
      ...incomes.map((i): Row => {
        income = income.add(i.amount);
        return {
          id: i.id,
          date: i.date,
          type: 'Income',
          reference: i.reference,
          categoryId: i.categoryId,
          category: i.categoryId ? (incomeCats.get(i.categoryId) ?? '—') : '—',
          amount: i.amount,
          note: i.note,
        };
      }),
      ...expenses.map((e): Row => {
        expense = expense.add(e.amount);
        return {
          id: e.id,
          date: e.date,
          type: 'Expense',
          reference: e.reference,
          categoryId: e.categoryId,
          category: e.categoryId ? (expenseCats.get(e.categoryId) ?? '—') : '—',
          amount: e.amount.neg(),
          note: e.note,
        };
      }),
    ];

    // reference/note LIKE filters apply to the merged set (both halves).
    if (q.reference) {
      const needle = q.reference.toLowerCase();
      rows = rows.filter((r) => r.reference.toLowerCase().includes(needle));
    }
    const noteNeedle = q.search;
    if (noteNeedle) {
      const needle = noteNeedle.toLowerCase();
      rows = rows.filter((r) => (r.note ?? '').toLowerCase().includes(needle));
    }

    rows.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      rows,
      totals: { income, expense, net: income.sub(expense) },
      from: date?.gte ?? null,
      to: date?.lte ?? null,
      dataGap:
        'Neither InventoryIncome nor InventoryExpense carries an attachment or GST breakdown — the attachment column is dropped and amount is the flat value (expense amounts are negated for the signed ledger).',
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * Resolve category ids → names for income or expense categories in one query.
   * Null ids are dropped; the returned map only contains ids that exist and
   * belong to the tenant.
   */
  private async categoryNameMap(
    tenantId: string,
    kind: 'income' | 'expense',
    ids: (string | null)[],
  ): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(ids.filter((x): x is string => !!x))];
    if (uniqueIds.length === 0) return new Map<string, string>();
    const where = { id: { in: uniqueIds }, tenantId };
    const cats =
      kind === 'income'
        ? await this.prisma.inventoryIncomeCategory.findMany({
            where,
            select: { id: true, name: true },
          })
        : await this.prisma.inventoryExpenseCategory.findMany({
            where,
            select: { id: true, name: true },
          });
    return new Map(cats.map((c) => [c.id, c.name]));
  }
}
