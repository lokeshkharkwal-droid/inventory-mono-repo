import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from './product.service';
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
    },
  ): Promise<Prisma.Decimal> {
    const { tenantId, branchId, productId, delta, cost } = params;
    const existing = await tx.inventoryWarehouseProduct.findUnique({
      where: { productId_branchId: { productId, branchId } },
    });

    const oldQty = existing?.quantity ?? new Prisma.Decimal(0);
    const oldAvg = existing?.avgCost ?? new Prisma.Decimal(0);
    const newQty = oldQty.add(delta);

    if (newQty.lt(0)) {
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

      // On an addition carrying a batch/expiry, also record a batch row so
      // batch/expiry tracking stays consistent with the on-hand quantity.
      if (isAddition && (dto.batchNo || dto.expiryDate)) {
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
      await tx.inventoryStockAdjustment.update({
        where: { id: adjId },
        data: { deletedAt: new Date() },
      });
      return { id: adjId };
    });
  }

  /** Paginated adjustment history for a product (optionally one branch). */
  async listAdjustments(
    productId: string,
    tenantId: string,
    query: AdjustmentQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    await this.productService.findById(productId, tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryStockAdjustmentWhereInput = {
      productId,
      tenantId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryStockAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryStockAdjustment.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }
}
