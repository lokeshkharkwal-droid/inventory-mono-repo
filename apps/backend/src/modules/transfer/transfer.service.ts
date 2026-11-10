import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { NumberingService } from '../settings/numbering.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import {
  CreateTransferDto,
  TransferQueryDto,
  ImportTransfersDto,
} from './dto/transfer.dto';
import {
  InvalidTransferStateException,
  SameBranchTransferException,
  TransferNotFoundException,
} from './exceptions/transfer.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Inter-branch stock transfers, two-stage (legacy send → receive):
 *  - create: records the transfer (status PENDING), snapshotting source cost.
 *  - send: removes stock from the source branch (status IN_TRANSIT).
 *  - receive: adds stock to the destination branch (status COMPLETED).
 * Branch ids are validated against the caller's tenant via the kalnostics API.
 */
@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly numbering: NumberingService,
  ) {}

  /** Create a transfer (no stock movement yet). */
  async create(tenantId: string, dto: CreateTransferDto, actorId?: string) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new SameBranchTransferException();
    }
    // Verify both branches belong to the caller's tenant (kalnostics enforces).
    await this.branchClient.findById(dto.fromBranchId);
    await this.branchClient.findById(dto.toBranchId);

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const stock = await this.prisma.inventoryWarehouseProduct.findUnique({
          where: {
            productId_branchId: {
              productId: product.id,
              branchId: dto.fromBranchId,
            },
          },
          select: { avgCost: true },
        });
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: D(item.quantity),
          cost: stock?.avgCost ?? D(product.cost),
        };
      }),
    );

    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'transfer'));

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryTransfer.create({
        data: {
          tenantId,
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          status: 'PENDING',
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      }),
    );
  }

  /** Send: remove stock from the source branch. Only valid when PENDING. */
  async send(id: string, tenantId: string) {
    const transfer = await this.findById(id, tenantId);
    if (transfer.status !== 'PENDING') {
      throw new InvalidTransferStateException(transfer.status, 'send');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      for (const l of transfer.items) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: transfer.fromBranchId,
          productId: l.productId,
          delta: D(l.quantity).negated(),
        });
      }
      return tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT' },
        include: { items: true },
      });
    });
  }

  /** Receive: add stock to the destination branch. Only valid when IN_TRANSIT. */
  async receive(id: string, tenantId: string) {
    const transfer = await this.findById(id, tenantId);
    if (transfer.status !== 'IN_TRANSIT') {
      throw new InvalidTransferStateException(transfer.status, 'receive');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      for (const l of transfer.items) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: transfer.toBranchId,
          productId: l.productId,
          delta: D(l.quantity),
          cost: D(l.cost),
        });
      }
      return tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: { items: true },
      });
    });
  }

  /**
   * Bulk import transfers (preview or commit). Each row is one full document;
   * reuses {@link create} (transfers start PENDING — no stock moves until send).
   */
  async import(
    tenantId: string,
    dto: ImportTransfersDto,
    actorId?: string,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateTransferDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.reference ?? `${row.fromBranchId}→${row.toBranchId}`,
      validate: (row) => {
        if (!row.fromBranchId || !row.toBranchId)
          throw new Error('Missing fromBranchId/toBranchId');
        if (row.fromBranchId === row.toBranchId)
          throw new Error('Source and destination branches must differ');
        if (!row.items?.length)
          throw new Error('At least one line item required');
      },
      create: (row) => this.create(tenantId, row, actorId),
    });
  }

  async findAll(
    tenantId: string,
    query: TransferQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryTransferWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryTransfer.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryTransfer.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!transfer) throw new TransferNotFoundException(id);
    return transfer;
  }

  /** Soft-delete a transfer. Only valid when PENDING (no stock moved yet). */
  async remove(id: string, tenantId: string) {
    const transfer = await this.findById(id, tenantId);
    if (transfer.status !== 'PENDING') {
      throw new InvalidTransferStateException(transfer.status, 'delete');
    }
    return this.prisma.inventoryTransfer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
