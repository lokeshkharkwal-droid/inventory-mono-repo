import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import {
  CreatePurchaseReturnDto,
  PurchaseReturnQueryDto,
} from './dto/purchase-return.dto';
import { PurchaseNotFoundException } from './exceptions/purchase.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — purchase return not found. */
export class PurchaseReturnNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PURCHASE_RETURN_NOT_FOUND',
      'Purchase return not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Purchase returns — goods sent back to a supplier. Reverses the inbound stock
 * at the original purchase's branch (outbound move) via ProductStockService.
 */
@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
  ) {}

  async create(
    tenantId: string,
    dto: CreatePurchaseReturnDto,
    actorId?: string,
  ) {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id: dto.purchaseId, tenantId, deletedAt: null },
      select: { id: true, branchId: true },
    });
    if (!purchase) throw new PurchaseNotFoundException(dto.purchaseId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const cost = D(item.cost);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          cost,
          subtotal: qty.mul(cost),
        };
      }),
    );
    const total = lines.reduce((s, l) => s.add(l.subtotal), D(0));

    return this.prisma.withTenant(tenantId, async (tx) => {
      const ret = await tx.inventoryPurchaseReturn.create({
        data: {
          tenantId,
          branchId: purchase.branchId,
          purchaseId: purchase.id,
          reference: dto.reference ?? generateReference('PRET'),
          date: dto.date ? new Date(dto.date) : new Date(),
          total,
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });
      for (const l of lines) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: purchase.branchId,
          productId: l.productId,
          delta: l.quantity.negated(),
        });
      }
      return ret;
    });
  }

  async findAll(
    tenantId: string,
    query: PurchaseReturnQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryPurchaseReturnWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.purchaseId ? { purchaseId: query.purchaseId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryPurchaseReturn.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryPurchaseReturn.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const ret = await this.prisma.inventoryPurchaseReturn.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!ret) throw new PurchaseReturnNotFoundException(id);
    return ret;
  }
}
