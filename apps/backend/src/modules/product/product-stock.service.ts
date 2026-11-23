import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { resolveWarehouseNameMap } from '../../common/utils/party-detail.util';
import { ProductService } from './product.service';
import { ProductBatchService } from './product-batch.service';
import {
  AdjustmentQueryDto,
  AllAdjustmentsQueryDto,
  RecordAdjustmentDto,
  UpdateAdjustmentDto,
} from './dto/stock-adjustment.dto';
import {
  BranchRequiredException,
  InsufficientStockException,
  ProductNotFoundException,
} from './exceptions/product.exceptions';

/**
 * Per-branch stock for products: on-hand view + manual adjustments. A branch is
 * the inventory "warehouse". Adjustments move `warehouse_products.quantity`
 * atomically and recompute the branch average cost on additions (AVCO), mirroring
 * the legacy stock math.
 */
@Injectable()
export class ProductStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly batchService: ProductBatchService,
    private readonly branchClient: KalnosticsBranchClient,
  ) {}

  /** On-hand stock for a product across all branches (warehouses). */
  async getStock(productId: string, tenantId: string) {
    await this.productService.findById(productId, tenantId); // 404 if not in tenant
    return this.prisma.inventoryWarehouseProduct.findMany({
      where: { productId, tenantId, deletedAt: null },
      select: {
        id: true,
        branchId: true,
        quantity: true,
        avgCost: true,
        rack: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Apply a signed stock delta to a (branch, product) warehouse row INSIDE an
   * existing transaction — the single source of truth for stock math, reused by
   * purchases (inbound), sales/transfers (outbound), and manual adjustments.
   *
   * Recomputes the branch average cost (AVCO) on inbound moves when a unit `cost`
   * is given. Throws if an outbound move would drive the quantity negative.
   *
   * @param tx the active Prisma transaction client
   * @returns the new on-hand quantity
   * @throws InsufficientStockException if the result would be negative
   */
  async applyDelta(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      branchId: string;
      productId: string;
      delta: Prisma.Decimal;
      cost?: Prisma.Decimal;
      /** Allow the on-hand quantity to go negative (reversals must never be blocked). */
      allowNegative?: boolean;
    },
  ): Promise<Prisma.Decimal> {
    const { tenantId, branchId, productId, delta, cost, allowNegative } =
      params;
    const existing = await tx.inventoryWarehouseProduct.findUnique({
      where: { productId_branchId: { productId, branchId } },
    });

    const oldQty = existing?.quantity ?? new Prisma.Decimal(0);
    const oldAvg = existing?.avgCost ?? new Prisma.Decimal(0);
    const newQty = oldQty.add(delta);

    if (newQty.lt(0) && !allowNegative) {
      throw new InsufficientStockException(
        productId,
        oldQty.toNumber(),
        delta.abs().toNumber(),
      );
    }

    let newAvg = oldAvg;
    if (delta.gt(0) && cost != null && newQty.gt(0)) {
      newAvg = oldQty.mul(oldAvg).add(delta.mul(cost)).div(newQty);
    }

    if (existing) {
      await tx.inventoryWarehouseProduct.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgCost: newAvg },
      });
    } else {
      await tx.inventoryWarehouseProduct.create({
        data: {
          tenantId,
          branchId,
          productId,
          quantity: newQty,
          avgCost: newAvg,
        },
      });
    }
    return newQty;
  }

  /**
   * Per-variant on-hand stock for a product across branches (EZHT
   * `warehouses_products_variants`). Returns each variant with its branch rows.
   */
  async getVariantStock(productId: string, tenantId: string) {
    await this.productService.findById(productId, tenantId); // 404 if not in tenant
    return this.prisma.inventoryProductVariant.findMany({
      where: { productId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        warehouseStocks: {
          where: { deletedAt: null },
          select: { id: true, branchId: true, quantity: true, cost: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Apply a signed stock delta to a (branch, variant) warehouse row INSIDE an
   * existing transaction — the variant-stock analogue of {@link applyDelta}
   * (EZHT `warehouses_products_variants`). Reused by sales (outbound), purchases
   * (inbound), and variant-targeted adjustments. Creates the row on first move.
   *
   * @throws InsufficientStockException if an outbound move would go negative
   */
  async applyVariantDelta(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      branchId: string;
      variantId: string;
      delta: Prisma.Decimal;
      cost?: Prisma.Decimal;
      allowNegative?: boolean;
    },
  ): Promise<Prisma.Decimal> {
    const { tenantId, branchId, variantId, delta, cost, allowNegative } =
      params;
    const existing = await tx.inventoryVariantWarehouseProduct.findUnique({
      where: { variantId_branchId: { variantId, branchId } },
    });

    const oldQty = existing?.quantity ?? new Prisma.Decimal(0);
    const newQty = oldQty.add(delta);

    if (newQty.lt(0) && !allowNegative) {
      throw new InsufficientStockException(
        variantId,
        oldQty.toNumber(),
        delta.abs().toNumber(),
      );
    }

    if (existing) {
      await tx.inventoryVariantWarehouseProduct.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          ...(delta.gt(0) && cost != null ? { cost } : {}),
        },
      });
    } else {
      await tx.inventoryVariantWarehouseProduct.create({
        data: { tenantId, branchId, variantId, quantity: newQty, cost },
      });
    }
    return newQty;
  }

  /**
   * Record a manual stock adjustment at `branchId` and apply it atomically.
   * @throws BranchRequiredException if no active branch
   * @throws InsufficientStockException if a subtraction would go negative
   */
  async recordAdjustment(
    tenantId: string,
    branchId: string | null,
    productId: string,
    dto: RecordAdjustmentDto,
    actorId?: string,
  ) {
    if (!branchId) throw new BranchRequiredException();
    await this.productService.findById(productId, tenantId);

    const delta = new Prisma.Decimal(dto.quantity);
    const isAddition = delta.gt(0);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const newQty = await this.applyDelta(tx, {
        tenantId,
        branchId,
        productId,
        delta,
        cost: dto.cost != null ? new Prisma.Decimal(dto.cost) : undefined,
      });

      // When the adjustment targets a specific "Purchased Item" batch, move that
      // batch's balance by the same signed delta so the batch ledger stays in
      // lock-step with the warehouse total (SUM(open batch.qty) == warehouse.qty).
      if (dto.batchId) {
        await this.batchService.applyAdjustmentDelta(tx, {
          tenantId,
          branchId,
          productId,
          batchId: dto.batchId,
          delta,
        });
      }

      // When the adjustment targets a specific variant, move that variant's
      // branch stock by the same signed delta (EZHT variant stock parity).
      if (dto.variantId) {
        await this.applyVariantDelta(tx, {
          tenantId,
          branchId,
          variantId: dto.variantId,
          delta,
          cost: dto.cost != null ? new Prisma.Decimal(dto.cost) : undefined,
        });
      }

      // Persist the adjustment's branch-level attributes onto the warehouse row
      // (last-write-wins) so the branch-scoped product list reflects the current
      // per-branch pricing/batch. Only set fields the caller actually provided.
      const stateUpdate: Prisma.InventoryWarehouseProductUpdateInput = {};
      if (dto.packSize != null) stateUpdate.packSize = dto.packSize;
      if (dto.packQuantity != null)
        stateUpdate.packQuantity = new Prisma.Decimal(dto.packQuantity);
      if (dto.unitMrp != null)
        stateUpdate.unitMrp = new Prisma.Decimal(dto.unitMrp);
      if (dto.packMrp != null)
        stateUpdate.packMrp = new Prisma.Decimal(dto.packMrp);
      if (dto.batchNo != null) stateUpdate.batchNo = dto.batchNo;
      if (dto.expiryDate != null)
        stateUpdate.expiryDate = new Date(dto.expiryDate);
      if (Object.keys(stateUpdate).length > 0) {
        await tx.inventoryWarehouseProduct.update({
          where: { productId_branchId: { productId, branchId } },
          data: stateUpdate,
        });
      }

      const adjustment = await tx.inventoryStockAdjustment.create({
        data: {
          tenantId,
          branchId,
          productId,
          quantity: delta,
          type: isAddition ? 'ADDITION' : 'SUBTRACTION',
          reason: dto.reason,
          note: dto.note,
          createdBy: actorId,
          batchId: dto.batchId,
          adjustedAt: dto.adjustedAt ? new Date(dto.adjustedAt) : new Date(),
          variantId: dto.variantId,
          packSize: dto.packSize,
          packQuantity:
            dto.packQuantity != null
              ? new Prisma.Decimal(dto.packQuantity)
              : undefined,
          batchNo: dto.batchNo,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          packMrp:
            dto.packMrp != null ? new Prisma.Decimal(dto.packMrp) : undefined,
          unitMrp:
            dto.unitMrp != null ? new Prisma.Decimal(dto.unitMrp) : undefined,
        },
      });

      // On an addition carrying a batch/expiry — and NOT already targeting an
      // existing batch (that path incremented it above) — record a new batch row
      // so batch/expiry tracking stays consistent with the on-hand quantity.
      if (isAddition && !dto.batchId && (dto.batchNo || dto.expiryDate)) {
        await tx.inventoryProductBatch.create({
          data: {
            tenantId,
            branchId,
            productId,
            batchNo: dto.batchNo,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            quantity: delta,
            cost: dto.cost != null ? new Prisma.Decimal(dto.cost) : undefined,
          },
        });
      }

      return { adjustment, quantity: newQty };
    });
  }

  /**
   * Tenant-wide adjustment history (the standalone Quantity Adjustments page),
   * joined with product code/name for display. Optionally filtered by branch /
   * product / free-text product search.
   */
  async listAllAdjustments(
    tenantId: string,
    query: AllAdjustmentsQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryStockAdjustmentWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.search
        ? {
            product: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryStockAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, code: true, name: true } },
        },
      });
      const count = await tx.inventoryStockAdjustment.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  /** Update an adjustment's descriptive fields (does NOT re-apply quantity). */
  async updateAdjustment(
    productId: string,
    tenantId: string,
    adjId: string,
    dto: UpdateAdjustmentDto,
  ) {
    await this.productService.findById(productId, tenantId);
    const existing = await this.prisma.inventoryStockAdjustment.findFirst({
      where: { id: adjId, productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new ProductNotFoundException(adjId);
    return this.prisma.inventoryStockAdjustment.update({
      where: { id: adjId },
      data: {
        reason: dto.reason,
        note: dto.note,
        adjustedAt: dto.adjustedAt ? new Date(dto.adjustedAt) : undefined,
        batchNo: dto.batchNo,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  /**
   * Delete an adjustment and reverse its stock effect (apply the opposite delta),
   * keeping on-hand quantity consistent.
   */
  async deleteAdjustment(productId: string, tenantId: string, adjId: string) {
    await this.productService.findById(productId, tenantId);
    const adj = await this.prisma.inventoryStockAdjustment.findFirst({
      where: { id: adjId, productId, tenantId, deletedAt: null },
    });
    if (!adj) throw new ProductNotFoundException(adjId);

    return this.prisma.withTenant(tenantId, async (tx) => {
      // Reverse the original delta so stock stays correct.
      await this.applyDelta(tx, {
        tenantId,
        branchId: adj.branchId,
        productId,
        delta: adj.quantity.negated(),
      });
      // Reverse the batch balance too when the adjustment targeted one (best-effort:
      // allow it to go negative so a delete is never blocked, mirroring the
      // warehouse reversal). A since-deleted batch is skipped.
      if (adj.batchId) {
        const batch = await tx.inventoryProductBatch.findFirst({
          where: { id: adj.batchId, deletedAt: null },
          select: { id: true },
        });
        if (batch) {
          await this.batchService.applyAdjustmentDelta(
            tx,
            {
              tenantId,
              branchId: adj.branchId,
              productId,
              batchId: adj.batchId,
              delta: adj.quantity.negated(),
            },
            { allowNegative: true },
          );
        }
      }
      // Reverse the variant stock move too (allow negative so delete is never
      // blocked, mirroring the warehouse reversal).
      if (adj.variantId) {
        await this.applyVariantDelta(tx, {
          tenantId,
          branchId: adj.branchId,
          variantId: adj.variantId,
          delta: adj.quantity.negated(),
          allowNegative: true,
        });
      }
      await tx.inventoryStockAdjustment.update({
        where: { id: adjId },
        data: { deletedAt: new Date() },
      });
      return { id: adjId };
    });
  }

  /**
   * Paginated adjustment history for a product (optionally one branch), enriched
   * with the EZHT product-view columns: product code/name, variant name and the
   * warehouse (branch) name resolved best-effort from the kalnostics Branch API.
   */
  async listAdjustments(
    productId: string,
    tenantId: string,
    query: AdjustmentQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const product = await this.productService.findById(productId, tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryStockAdjustmentWhereInput = {
      productId,
      tenantId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction(async (tx) => {
      const data = await tx.inventoryStockAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryStockAdjustment.count({ where });
      return [data, count] as const;
    });

    const variantIds = [
      ...new Set(rows.map((r) => r.variantId).filter(Boolean) as string[]),
    ];
    const [variants, branchMap] = await Promise.all([
      variantIds.length
        ? this.prisma.inventoryProductVariant.findMany({
            where: { tenantId, id: { in: variantIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      resolveWarehouseNameMap(
        this.branchClient,
        rows.map((r) => r.branchId),
      ),
    ]);
    const variantMap = new Map(variants.map((v) => [v.id, v.name]));

    const data = rows.map((r) => ({
      ...r,
      productCode: product.code,
      productName: product.name,
      variantName: r.variantId ? (variantMap.get(r.variantId) ?? null) : null,
      warehouseName: r.branchId ? (branchMap.get(r.branchId) ?? null) : null,
    }));

    return { data, total, page, limit };
  }
}
