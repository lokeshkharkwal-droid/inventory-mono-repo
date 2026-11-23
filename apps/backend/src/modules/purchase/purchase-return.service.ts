import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { computeOrderTotals } from '../../common/utils/order-totals.util';
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
      select: {
        id: true,
        branchId: true,
        supplierId: true,
        status: true,
        gstNumber: true,
        gstState: true,
      },
    });
    if (!purchase) throw new PurchaseNotFoundException(dto.purchaseId);
    // EZHT: only goods actually received can be returned.
    if (purchase.status !== 'RECEIVED') {
      throw new KaltrosException(
        'PURCHASE_NOT_RETURNABLE',
        'Only a received purchase can be returned.',
        { id: purchase.id, status: purchase.status },
        HttpStatus.CONFLICT,
      );
    }

    const resolved = await Promise.all(
      dto.items.map(async (item) => ({
        item,
        product: await this.productService.findById(item.productId, tenantId),
      })),
    );

    // Compute the refund money the same way a purchase is costed (tax incl/excl,
    // GST split) so returns mirror the original lines (EZHT calculatePurchaseTotals).
    const totals = computeOrderTotals({
      lines: resolved.map(({ item }) => ({
        quantity: item.quantity,
        unitPrice: item.cost,
        discount: item.discount,
        taxRatePercent: item.taxRate ?? 0,
        taxInclusive: false,
      })),
      interState: dto.interState ?? false,
    });

    const lines = resolved.map(({ item, product }, i) => {
      const c = totals.lines[i]!;
      return {
        tenantId,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        purchaseItemId: item.purchaseItemId,
        quantity: c.quantity,
        cost: D(item.cost),
        netUnitCost: c.netUnitPrice,
        taxRate: D(item.taxRate ?? 0),
        taxAmount: c.taxAmount,
        discount: c.discount,
        discountSpec: item.discount,
        mrp: item.mrp != null ? D(item.mrp) : null,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        packSize: item.packSize != null ? D(item.packSize) : null,
        hsnCode: item.hsnCode,
        subtotal: c.subtotal,
        igst: c.igst,
        cgst: c.cgst,
        sgst: c.sgst,
      };
    });

    const surcharge = D(dto.surcharge ?? 0);
    // Refund = goods value + tax − surcharge (EZHT: surcharge reduces the refund).
    const grandTotal = totals.subtotal.add(totals.productTax).sub(surcharge);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const ret = await tx.inventoryPurchaseReturn.create({
        data: {
          tenantId,
          branchId: purchase.branchId,
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          reference: dto.reference ?? generateReference('PRET'),
          date: dto.date ? new Date(dto.date) : new Date(),
          total: totals.subtotal,
          productTax: totals.productTax,
          totalTax: totals.totalTax,
          surcharge,
          grandTotal,
          igst: totals.igst,
          cgst: totals.cgst,
          sgst: totals.sgst,
          taxMethod: dto.interState ? 'igst' : 'cgst+sgst',
          gstNumber: purchase.gstNumber,
          gstState: purchase.gstState,
          note: dto.note,
          attachmentUrl: dto.attachmentUrl,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });
      // Reverse the inbound stock at the original branch (outbound move). Allow
      // negative — a reversal must never be blocked by stock already consumed.
      for (const l of lines) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: purchase.branchId,
          productId: l.productId,
          delta: l.quantity.negated(),
          allowNegative: true,
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
      ...(query.search
        ? { reference: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [rows, total, pmap] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryPurchaseReturn.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryPurchaseReturn.count({ where });
      // Resolve each return's original purchase reference + supplier name.
      const ids = [...new Set(rows.map((r) => r.purchaseId))];
      const purchases = ids.length
        ? await tx.inventoryPurchase.findMany({
            where: { id: { in: ids }, tenantId },
            select: {
              id: true,
              reference: true,
              supplier: { select: { name: true } },
            },
          })
        : [];
      return [rows, count, new Map(purchases.map((p) => [p.id, p]))] as const;
    });
    const data = rows.map((r) => ({
      ...r,
      purchaseReference: pmap.get(r.purchaseId)?.reference ?? null,
      supplierName: pmap.get(r.purchaseId)?.supplier?.name ?? null,
    }));
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
