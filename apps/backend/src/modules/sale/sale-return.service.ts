import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { CreateSaleReturnDto, SaleReturnQueryDto } from './dto/sale-return.dto';
import { SaleNotFoundException } from './exceptions/sale.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — sale return not found. */
export class SaleReturnNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'SALE_RETURN_NOT_FOUND',
      'Sale return not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Sale returns — goods returned by the customer. Restocks (inbound) at the
 * original sale's branch; the avg cost is left unchanged (no cost on restock).
 */
@Injectable()
export class SaleReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
  ) {}

  async create(tenantId: string, dto: CreateSaleReturnDto, actorId?: string) {
    const sale = await this.prisma.inventorySale.findFirst({
      where: { id: dto.saleId, tenantId, deletedAt: null },
      select: { id: true, branchId: true },
    });
    if (!sale) throw new SaleNotFoundException(dto.saleId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const price = D(item.price);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          price,
          subtotal: qty.mul(price),
        };
      }),
    );
    const total = lines.reduce((s, l) => s.add(l.subtotal), D(0));

    return this.prisma.withTenant(tenantId, async (tx) => {
      const ret = await tx.inventorySaleReturn.create({
        data: {
          tenantId,
          branchId: sale.branchId,
          saleId: sale.id,
          reference: dto.reference ?? generateReference('SRET'),
          date: dto.date ? new Date(dto.date) : new Date(),
          total,
          refundAmount: D(dto.refundAmount ?? 0),
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });
      for (const l of lines) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: sale.branchId,
          productId: l.productId,
          delta: l.quantity, // restock (avg cost unchanged — no cost supplied)
        });
      }
      return ret;
    });
  }

  async findAll(
    tenantId: string,
    query: SaleReturnQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySaleReturnWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.saleId ? { saleId: query.saleId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySaleReturn.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventorySaleReturn.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const ret = await this.prisma.inventorySaleReturn.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!ret) throw new SaleReturnNotFoundException(id);
    return ret;
  }
}
