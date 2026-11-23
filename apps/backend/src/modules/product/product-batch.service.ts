import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { resolveWarehouseDetail } from '../../common/utils/party-detail.util';
import {
  BatchNotFoundException,
  ExpiredBatchException,
  InsufficientBatchQuantityException,
} from './exceptions/batch.exceptions';

/** A row ready for the sale form / detail panel. */
export interface AvailableBatch {
  id: string;
  batchNo: string | null;
  serialNo: string | null;
  expiryDate: Date | null;
  quantity: Prisma.Decimal;
  cost: Prisma.Decimal | null;
}

/**
 * One batch-level row for the Add-Sale product autocomplete (EZHT parity): the
 * user searches by product name and the dropdown lists ONE ROW PER BATCH, each
 * carrying the batch's serial/expiry/quantity (signed — negatives preserved) and
 * the line defaults (price/mrp/tax/hsn/pack/variant) needed to populate an order
 * item. Mirrors legacy `Sales_model::getProductNames` + `getPurchasedItemsBySerial`.
 */
export interface BatchSearchRow {
  batchId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  batchNo: string | null;
  serialNo: string | null;
  expiryDate: Date | null;
  /** Available quantity in this batch — SIGNED (negative stock is preserved). */
  quantity: Prisma.Decimal;
  /** Unit selling price (from the product). */
  price: Prisma.Decimal;
  cost: Prisma.Decimal | null;
  mrp: Prisma.Decimal | null;
  /** Tax rate percentage for the line. */
  taxRate: Prisma.Decimal;
  taxRateId: string | null;
  hsnCode: string | null;
  packSize: Prisma.Decimal | null;
  /** True when the product price already includes tax. */
  isTaxIncluded: boolean;
  /** Variant (EZHT "option") of the originating purchase line, if any. */
  optionId: string | null;
}

/**
 * A fully-described batch row for the Product Details "Batches" panel (EZHT
 * product-view parity). Pack/mrp/tax/hsn/variant come from the originating
 * purchase line; serial/expiry/quantity/cost from the batch itself.
 */
export interface ProductBatchDetail {
  id: string;
  date: Date | null;
  productCode: string | null;
  productName: string | null;
  variantName: string | null;
  serialNo: string | null;
  expiryDate: Date | null;
  packSize: Prisma.Decimal | null;
  packCost: Prisma.Decimal | null;
  cost: Prisma.Decimal | null;
  packMrp: Prisma.Decimal | null;
  mrp: Prisma.Decimal | null;
  taxRate: Prisma.Decimal | null;
  hsnCode: string | null;
  quantity: Prisma.Decimal;
  warehouseName: string | null;
  branchId: string;
}

/** Midnight (local) of today — a batch is expired once its expiry date is before this. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Same calendar instant (both null counts as a match) for batch↔purchase-line pairing. */
function sameDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.getTime() === b.getTime();
}

/**
 * Per-branch product batch ledger (expiry/serial tracking). `InventoryProductBatch`
 * is the single maintained source of truth for batches: a batch row is created for
 * every received purchase line, decremented when a sale draws from it, and restored
 * when that sale is edited. The aggregate `InventoryWarehouseProduct.quantity` is
 * kept in lock-step by {@link ProductStockService} so that, per (tenant, branch,
 * product), `SUM(open batch.quantity) == warehouse.quantity`.
 */
@Injectable()
export class ProductBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchClient: KalnosticsBranchClient,
  ) {}

  /**
   * Create a batch row for an inbound movement (purchase receipt / addition) INSIDE
   * an existing transaction. `batchNo`/`expiryDate` may be null — a batch is still
   * recorded so the on-hand quantity always has a batch behind it.
   * @param tx the active Prisma transaction client
   * @returns the created batch
   */
  async createBatch(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      branchId: string;
      productId: string;
      batchNo?: string | null;
      serialNo?: string | null;
      expiryDate?: Date | null;
      quantity: Prisma.Decimal;
      cost?: Prisma.Decimal | null;
      sourcePurchaseId?: string | null;
    },
  ) {
    return tx.inventoryProductBatch.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        productId: params.productId,
        batchNo: params.batchNo ?? null,
        serialNo: params.serialNo ?? null,
        expiryDate: params.expiryDate ?? null,
        quantity: params.quantity,
        cost: params.cost ?? null,
        sourcePurchaseId: params.sourcePurchaseId ?? null,
      },
    });
  }

  /**
   * Decrement a chosen batch for an outbound movement (a sale line) INSIDE an
   * existing transaction. Validates that the batch belongs to this
   * tenant/branch/product, is not soft-deleted, holds enough quantity, and — when
   * `blockExpired` is set — is not expired.
   * @returns the batch's remaining quantity
   * @throws BatchNotFoundException / InsufficientBatchQuantityException / ExpiredBatchException
   */
  async consume(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      branchId: string;
      productId: string;
      batchId: string;
      quantity: Prisma.Decimal;
      blockExpired?: boolean;
    },
  ): Promise<Prisma.Decimal> {
    const { tenantId, branchId, productId, batchId, quantity, blockExpired } =
      params;
    const batch = await tx.inventoryProductBatch.findFirst({
      where: { id: batchId, tenantId, branchId, productId, deletedAt: null },
    });
    if (!batch) throw new BatchNotFoundException(batchId);

    if (
      blockExpired &&
      batch.expiryDate != null &&
      batch.expiryDate < startOfToday()
    ) {
      throw new ExpiredBatchException(
        batchId,
        batch.expiryDate.toISOString().slice(0, 10),
      );
    }

    const remaining = batch.quantity.sub(quantity);
    if (remaining.lt(0)) {
      throw new InsufficientBatchQuantityException(
        batchId,
        batch.quantity.toNumber(),
        quantity.toNumber(),
      );
    }

    await tx.inventoryProductBatch.update({
      where: { id: batchId },
      data: { quantity: remaining },
    });
    return remaining;
  }

  /**
   * Apply a SIGNED delta to a chosen batch INSIDE an existing transaction — used by
   * a manual quantity adjustment that targets a specific "Purchased Item" batch, so
   * the batch balance moves in lock-step with the warehouse total. Validates the
   * batch belongs to this tenant/branch/product and (by default) guards the balance
   * from going negative.
   * @param opts.allowNegative skip the non-negative guard (used when reversing a
   *   deleted adjustment best-effort, mirroring the warehouse reversal)
   * @returns the batch's new quantity
   * @throws BatchNotFoundException / InsufficientBatchQuantityException
   */
  async applyAdjustmentDelta(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      branchId: string;
      productId: string;
      batchId: string;
      delta: Prisma.Decimal;
    },
    opts: { allowNegative?: boolean } = {},
  ): Promise<Prisma.Decimal> {
    const { tenantId, branchId, productId, batchId, delta } = params;
    const batch = await tx.inventoryProductBatch.findFirst({
      where: { id: batchId, tenantId, branchId, productId, deletedAt: null },
    });
    if (!batch) throw new BatchNotFoundException(batchId);

    const newQty = batch.quantity.add(delta);
    if (!opts.allowNegative && newQty.lt(0)) {
      throw new InsufficientBatchQuantityException(
        batchId,
        batch.quantity.toNumber(),
        delta.abs().toNumber(),
      );
    }
    await tx.inventoryProductBatch.update({
      where: { id: batchId },
      data: { quantity: newQty },
    });
    return newQty;
  }

  /**
   * Add quantity back to a batch INSIDE an existing transaction — reverses a prior
   * {@link consume} when a sale is edited. No-op for a null/absent batch (legacy
   * sale lines created before batch-aware sales carry no batchId).
   */
  async restore(
    tx: Prisma.TransactionClient,
    params: { batchId: string | null | undefined; quantity: Prisma.Decimal },
  ): Promise<void> {
    if (!params.batchId) return;
    const batch = await tx.inventoryProductBatch.findFirst({
      where: { id: params.batchId, deletedAt: null },
      select: { id: true },
    });
    if (!batch) return;
    await tx.inventoryProductBatch.update({
      where: { id: params.batchId },
      data: { quantity: { increment: params.quantity } },
    });
  }

  /**
   * Batches of a product available at a branch, earliest-expiry first (FIFO). Used
   * by the sale form (default: in-stock, non-expired) and the Product Details batch
   * panel (`includeExpired` + `includeEmpty`).
   */
  async availableForProduct(
    tenantId: string,
    branchId: string,
    productId: string,
    opts: { includeExpired?: boolean; includeEmpty?: boolean } = {},
  ): Promise<AvailableBatch[]> {
    const where: Prisma.InventoryProductBatchWhereInput = {
      tenantId,
      branchId,
      productId,
      deletedAt: null,
    };
    where.quantity = opts.includeEmpty ? { not: 0 } : { gt: 0 };
    if (!opts.includeExpired) {
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gte: startOfToday() } },
      ];
    }

    return this.prisma.inventoryProductBatch.findMany({
      where,
      select: {
        id: true,
        batchNo: true,
        serialNo: true,
        expiryDate: true,
        quantity: true,
        cost: true,
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Fully-described batches of a product at a branch for the Product Details
   * "Batches" panel (EZHT product-view parity). Each batch is paired with its
   * originating purchase line (by `sourcePurchaseId` + productId, disambiguated on
   * batchNo/expiry) to surface the line's pack size, cost, MRP, tax rate, HSN code
   * and variant; pack cost / pack MRP are derived as unit × pack size (falling back
   * to the product's pack cost/MRP). Serial/expiry/quantity/cost come from the
   * batch; the warehouse name is resolved best-effort from the Branch API. Rows
   * without a purchase source (adjustment/legacy batches) leave line-only fields null.
   */
  async detailForProduct(
    tenantId: string,
    branchId: string,
    productId: string,
    opts: { includeExpired?: boolean; includeEmpty?: boolean } = {},
  ): Promise<ProductBatchDetail[]> {
    const where: Prisma.InventoryProductBatchWhereInput = {
      tenantId,
      branchId,
      productId,
      deletedAt: null,
    };
    where.quantity = opts.includeEmpty ? { not: 0 } : { gt: 0 };
    if (!opts.includeExpired) {
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gte: startOfToday() } },
      ];
    }

    const batches = await this.prisma.inventoryProductBatch.findMany({
      where,
      select: {
        id: true,
        batchNo: true,
        serialNo: true,
        expiryDate: true,
        quantity: true,
        cost: true,
        createdAt: true,
        branchId: true,
        sourcePurchaseId: true,
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
    if (!batches.length) return [];

    const purchaseIds = [
      ...new Set(
        batches.map((b) => b.sourcePurchaseId).filter(Boolean) as string[],
      ),
    ];

    const [product, items, warehouseName] = await Promise.all([
      this.prisma.inventoryProduct.findFirst({
        where: { id: productId, tenantId },
        select: {
          code: true,
          name: true,
          hsnCode: true,
          packCost: true,
          packMrp: true,
        },
      }),
      purchaseIds.length
        ? this.prisma.inventoryPurchaseItem.findMany({
            where: { tenantId, productId, purchaseId: { in: purchaseIds } },
            select: {
              purchaseId: true,
              batchNo: true,
              expiryDate: true,
              packSize: true,
              mrp: true,
              taxRate: true,
              hsnCode: true,
              cost: true,
              optionId: true,
              productName: true,
              productCode: true,
              purchase: { select: { date: true } },
            },
          })
        : Promise.resolve([]),
      resolveWarehouseDetail(this.branchClient, branchId).then(
        (w) => w?.name ?? null,
      ),
    ]);

    type LineItem = (typeof items)[number];
    const optionIds = [
      ...new Set(items.map((i) => i.optionId).filter(Boolean) as string[]),
    ];
    const variants = optionIds.length
      ? await this.prisma.inventoryProductVariant.findMany({
          where: { tenantId, id: { in: optionIds } },
          select: { id: true, name: true },
        })
      : [];
    const variantMap = new Map(variants.map((v) => [v.id, v.name]));

    /** Best matching purchase line for a batch: same purchase, then batchNo+expiry. */
    const matchItem = (b: (typeof batches)[number]): LineItem | null => {
      const cands = items.filter((i) => i.purchaseId === b.sourcePurchaseId);
      if (!cands.length) return null;
      return (
        cands.find(
          (i) =>
            (i.batchNo ?? null) === (b.batchNo ?? null) &&
            sameDay(i.expiryDate, b.expiryDate),
        ) ?? cands[0]!
      );
    };

    return batches.map((b) => {
      const it = matchItem(b);
      const packSize = it?.packSize ?? null;
      const unitCost = b.cost ?? it?.cost ?? null;
      const mrp = it?.mrp ?? null;
      const packCost =
        unitCost != null && packSize != null
          ? unitCost.mul(packSize)
          : (product?.packCost ?? null);
      const packMrp =
        mrp != null && packSize != null
          ? mrp.mul(packSize)
          : (product?.packMrp ?? null);
      return {
        id: b.id,
        date: it?.purchase?.date ?? b.createdAt,
        productCode: it?.productCode ?? product?.code ?? null,
        productName: it?.productName ?? product?.name ?? null,
        variantName: it?.optionId
          ? (variantMap.get(it.optionId) ?? null)
          : null,
        serialNo: b.serialNo,
        expiryDate: b.expiryDate,
        packSize,
        packCost,
        cost: unitCost,
        packMrp,
        mrp,
        taxRate: it?.taxRate ?? null,
        hsnCode: it?.hsnCode ?? product?.hsnCode ?? null,
        quantity: b.quantity,
        warehouseName,
        branchId: b.branchId,
      };
    });
  }

  /**
   * Batch-level product search for the Add-Sale autocomplete (EZHT parity). Finds
   * every batch at `branchId` whose product name/code matches `term`, with a
   * NON-ZERO balance (negatives preserved — EZHT never hides negative stock), and
   * returns one row per batch pre-loaded with the line defaults (price, mrp, tax,
   * hsn, pack size, variant). Enriches mrp/hsn/pack/variant from the originating
   * purchase line when available (falling back to the product). Ordered by product
   * name then earliest expiry.
   */
  async searchBatches(
    tenantId: string,
    branchId: string,
    term: string | undefined,
    opts: { limit?: number } = {},
  ): Promise<BatchSearchRow[]> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const t = (term ?? '').trim();
    const where: Prisma.InventoryProductBatchWhereInput = {
      tenantId,
      branchId,
      deletedAt: null,
      quantity: { not: 0 }, // preserve negative stock (EZHT `quantity_balance != 0`)
      product: {
        deletedAt: null,
        ...(t
          ? {
              OR: [
                { name: { contains: t, mode: 'insensitive' } },
                { code: { contains: t, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };

    const batches = await this.prisma.inventoryProductBatch.findMany({
      where,
      select: {
        id: true,
        productId: true,
        batchNo: true,
        serialNo: true,
        expiryDate: true,
        quantity: true,
        cost: true,
        sourcePurchaseId: true,
        product: {
          select: {
            code: true,
            name: true,
            price: true,
            cost: true,
            hsnCode: true,
            packSize: true,
            packMrp: true,
            taxRateId: true,
            isTaxIncluded: true,
            taxRate: { select: { rate: true } },
          },
        },
      },
      orderBy: [
        { product: { name: 'asc' } },
        { expiryDate: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });
    if (!batches.length) return [];

    // Enrich mrp/hsn/pack/variant from each batch's originating purchase line.
    const purchaseIds = [
      ...new Set(
        batches.map((b) => b.sourcePurchaseId).filter(Boolean) as string[],
      ),
    ];
    const items = purchaseIds.length
      ? await this.prisma.inventoryPurchaseItem.findMany({
          where: { tenantId, purchaseId: { in: purchaseIds } },
          select: {
            purchaseId: true,
            productId: true,
            batchNo: true,
            expiryDate: true,
            packSize: true,
            mrp: true,
            hsnCode: true,
            optionId: true,
          },
        })
      : [];
    const matchItem = (b: (typeof batches)[number]): (typeof items)[number] | null => {
      const cands = items.filter(
        (i) => i.purchaseId === b.sourcePurchaseId && i.productId === b.productId,
      );
      if (!cands.length) return null;
      return (
        cands.find(
          (i) =>
            (i.batchNo ?? null) === (b.batchNo ?? null) &&
            sameDay(i.expiryDate, b.expiryDate),
        ) ?? cands[0]!
      );
    };

    /** Parse the product's string pack size to a Decimal (null when non-numeric). */
    const parsePack = (s: string | null): Prisma.Decimal | null => {
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? new Prisma.Decimal(n) : null;
    };

    return batches.map((b) => {
      const it = matchItem(b);
      const p = b.product;
      return {
        batchId: b.id,
        productId: b.productId,
        productName: p.name,
        productCode: p.code ?? null,
        batchNo: b.batchNo,
        serialNo: b.serialNo,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        price: p.price,
        cost: b.cost ?? p.cost ?? null,
        mrp: it?.mrp ?? p.packMrp ?? null,
        taxRate: p.taxRate?.rate ?? new Prisma.Decimal(0),
        taxRateId: p.taxRateId ?? null,
        hsnCode: it?.hsnCode ?? p.hsnCode ?? null,
        packSize: it?.packSize ?? parsePack(p.packSize),
        isTaxIncluded: p.isTaxIncluded,
        optionId: it?.optionId ?? null,
      };
    });
  }
}
