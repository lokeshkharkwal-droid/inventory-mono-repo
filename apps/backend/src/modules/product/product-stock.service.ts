import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from './product.service';
import {
  AdjustmentQueryDto,
  RecordAdjustmentDto,
} from './dto/stock-adjustment.dto';
import {
  BranchRequiredException,
  InsufficientStockException,
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
        },
      });

      return { adjustment, quantity: newQty };
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
