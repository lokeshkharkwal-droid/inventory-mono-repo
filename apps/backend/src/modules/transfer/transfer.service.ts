import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { ProductBatchService } from '../product/product-batch.service';
import { BatchNotFoundException } from '../product/exceptions/batch.exceptions';
import { NumberingService } from '../settings/numbering.service';
import { SettingsService } from '../settings/settings.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsPrintTemplateClient } from '../../integration/clients/kalnostics-print-template.client';
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

/** The minimal line shape the stock-movement helpers need (persisted item or built line). */
interface StockMovementLine {
  productId: string;
  quantity: Prisma.Decimal | number | string;
  cost?: Prisma.Decimal | number | string | null;
  batchId?: string | null;
  batchNo?: string | null;
  productSerial?: string | null;
  expiryDate?: Date | null;
}

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
    private readonly batchService: ProductBatchService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly numbering: NumberingService,
    private readonly settingsService: SettingsService,
    private readonly printTemplateClient: KalnosticsPrintTemplateClient,
  ) {}

  /** Resolve a branch display name best-effort (falls back to the id). */
  private async branchName(id: string | null): Promise<string> {
    if (!id) return '';
    try {
      const branch = await this.branchClient.findById(id);
      return (branch as { name?: string }).name ?? id;
    } catch {
      return id;
    }
  }

  /**
   * Render this transfer through the kalnostics print engine's
   * `inventory_transfer` template type and return the raw PDF bytes.
   */
  async renderTransferPdf(
    id: string,
    tenantId: string,
  ): Promise<{ pdf: Buffer; reference: string }> {
    const transfer = await this.findById(id, tenantId);
    const settings = await this.settingsService.get(
      tenantId,
      transfer.fromBranchId,
    );
    const money = (v: Prisma.Decimal | number | string | null) =>
      D(v ?? 0).toFixed(2);
    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.branchName(transfer.fromBranchId),
      this.branchName(transfer.toBranchId),
    ]);

    const variables: Record<string, unknown> = {
      transfer_number: transfer.reference,
      transfer_date: transfer.date.toISOString().slice(0, 10),
      status: transfer.status,
      from_warehouse: fromWarehouse,
      to_warehouse: toWarehouse,
      from_department: transfer.fromDepartment ?? '',
      to_department: transfer.toDepartment ?? '',
      business_name: settings.businessName ?? '',
      business_address: settings.businessAddress ?? '',
      business_phone: settings.businessPhone ?? '',
      business_email: settings.businessEmail ?? '',
      total: money(transfer.total),
      total_tax: money(transfer.totalTax),
      shipping: money(transfer.shipping),
      grand_total: money(transfer.grandTotal),
      note: transfer.note ?? '',
    };

    const items = transfer.items.map((it, idx) => ({
      no: String(idx + 1),
      product_name: it.productName,
      product_code: it.productCode ?? '',
      hsn_code: it.hsnCode ?? '',
      batch_no: it.batchNo ?? '',
      serial_no: it.productSerial ?? '',
      expiry: it.expiryDate ? it.expiryDate.toISOString().slice(0, 10) : '',
      quantity: D(it.quantity).toFixed(2),
      rate: money(it.rate),
      mrp: money(it.mrp),
      pack_mrp: money(it.packMrp),
      tax_rate: it.taxRate != null ? D(it.taxRate).toFixed(2) : '0.00',
      tax_amount: money(it.taxAmount),
      subtotal: money(it.subtotal),
    }));

    const pdf = await this.printTemplateClient.renderByType(
      'inventory_transfer',
      { variables, sections: { items } },
    );
    return { pdf, reference: transfer.reference };
  }

  /**
   * Resolve + snapshot each product line and compute header totals
   * (shared by create + update).
   */
  private async buildLines(tenantId: string, dto: CreateTransferDto) {
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
        // Batch-level parity (EZHT): when a line targets a specific source batch,
        // resolve it (scoped to the source branch) and snapshot its identity + cost
        // so send() can deduct exactly that batch and receive() can recreate it at
        // the destination, preserving batch no / serial / expiry.
        const batch = item.batchId
          ? await this.prisma.inventoryProductBatch.findFirst({
              where: {
                id: item.batchId,
                tenantId,
                branchId: dto.fromBranchId,
                productId: product.id,
                deletedAt: null,
              },
              select: {
                id: true,
                batchNo: true,
                serialNo: true,
                expiryDate: true,
                cost: true,
              },
            })
          : null;
        if (item.batchId && !batch)
          throw new BatchNotFoundException(item.batchId);
        // Priced columns (EZHT parity): subtotal = rate × qty + tax.
        const rate = item.rate != null ? D(item.rate) : null;
        const taxRate = item.taxRate != null ? D(item.taxRate) : null;
        const base = (rate ?? D(0)).mul(D(item.quantity));
        const taxAmount = taxRate != null ? base.mul(taxRate).div(100) : null;
        const subtotal = rate != null ? base.add(taxAmount ?? D(0)) : null;
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: D(item.quantity),
          quantityBalance: D(item.quantity),
          cost: batch?.cost ?? stock?.avgCost ?? D(product.cost),
          batchId: batch?.id ?? null,
          batchNo: batch?.batchNo ?? item.batchNo ?? null,
          expiryDate:
            batch?.expiryDate ??
            (item.expiryDate ? new Date(item.expiryDate) : null),
          productSerial: batch?.serialNo ?? item.productSerial ?? null,
          packSize: item.packSize ?? null,
          packQuantity: item.packQuantity != null ? D(item.packQuantity) : null,
          rate,
          mrp: item.mrp != null ? D(item.mrp) : null,
          packMrp: item.packMrp != null ? D(item.packMrp) : null,
          hsnCode: item.hsnCode ?? null,
          taxRate,
          taxAmount,
          subtotal,
        };
      }),
    );

    const itemsTotal = lines.reduce(
      (sum, l) => sum.add(l.subtotal ?? D(0)),
      D(0),
    );
    const totalTax = lines.reduce(
      (sum, l) => sum.add(l.taxAmount ?? D(0)),
      D(0),
    );
    // `total` is the pre-tax net (items subtotal − tax), mirroring the EZHT list.
    const total = itemsTotal.sub(totalTax);
    const grandTotal = itemsTotal.add(
      dto.shipping != null ? D(dto.shipping) : D(0),
    );
    return { lines, total, totalTax, grandTotal };
  }

  /** Create a transfer (no stock movement yet). */
  async create(tenantId: string, dto: CreateTransferDto, actorId?: string) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new SameBranchTransferException();
    }
    // Verify both branches belong to the caller's tenant (kalnostics enforces).
    await this.branchClient.findById(dto.fromBranchId);
    await this.branchClient.findById(dto.toBranchId);

    const { lines, total, totalTax, grandTotal } = await this.buildLines(
      tenantId,
      dto,
    );

    const reference =
      dto.reference ??
      (await this.numbering.next(tenantId, 'transfer', dto.fromBranchId));

    // Always persist as PENDING first; the legacy "Sent"/"Completed" status
    // must actually move stock, which we do via send()/receive() below so the
    // weighted-average cost ledger stays correct.
    const created = await this.prisma.withTenant(tenantId, async (tx) =>
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
          fromDepartment: dto.fromDepartment ?? null,
          toDepartment: dto.toDepartment ?? null,
          shipping: dto.shipping != null ? D(dto.shipping) : null,
          total,
          totalTax,
          attachmentUrl: dto.attachmentUrl ?? null,
          grandTotal,
          items: { create: lines },
        },
        include: { items: true },
      }),
    );

    // EZHT "Sent" → auto-send (stock out); "Completed" → auto-send + receive.
    const requested = dto.status ?? 'PENDING';
    if (requested === 'IN_TRANSIT') {
      return this.send(created.id, tenantId);
    }
    if (requested === 'COMPLETED') {
      await this.send(created.id, tenantId);
      return this.receive(created.id, tenantId);
    }
    return created;
  }

  /**
   * Edit a transfer (full EZHT `resetTransferActions` parity). For a transfer that
   * has already moved stock (IN_TRANSIT / COMPLETED) the prior movement is REVERSED,
   * the line items are replaced, and the movement is RE-APPLIED for the target
   * status — all in one transaction, so stock stays correct and no batch is
   * double-moved. A PENDING transfer simply has its items/totals replaced (no
   * stock moves). The legacy "Status" dropdown is on the edit form too, so an edit
   * may also change the status; stock is settled to match the target status.
   */
  async update(id: string, tenantId: string, dto: CreateTransferDto) {
    const transfer = await this.findById(id, tenantId);
    if (dto.fromBranchId === dto.toBranchId) {
      throw new SameBranchTransferException();
    }
    await this.branchClient.findById(dto.fromBranchId);
    await this.branchClient.findById(dto.toBranchId);

    const { lines, total, totalTax, grandTotal } = await this.buildLines(
      tenantId,
      dto,
    );
    const oldStatus = transfer.status;
    const targetStatus = dto.status ?? oldStatus;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Reverse the stock applied for the OLD status/lines (resetTransferActions).
      if (oldStatus === 'COMPLETED') {
        await this.stockIn(
          tx,
          tenantId,
          transfer.toBranchId,
          transfer.items,
          true,
        );
        await this.stockOut(
          tx,
          tenantId,
          transfer.fromBranchId,
          transfer.items,
          true,
        );
      } else if (oldStatus === 'IN_TRANSIT') {
        await this.stockOut(
          tx,
          tenantId,
          transfer.fromBranchId,
          transfer.items,
          true,
        );
      }

      // 2. Replace line items.
      await tx.inventoryTransferItem.deleteMany({ where: { transferId: id } });

      // 3. Re-apply the stock movement for the TARGET status with the NEW lines.
      if (targetStatus === 'IN_TRANSIT' || targetStatus === 'COMPLETED') {
        await this.stockOut(tx, tenantId, dto.fromBranchId, lines);
      }
      if (targetStatus === 'COMPLETED') {
        await this.stockIn(tx, tenantId, dto.toBranchId, lines);
      }

      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          reference: dto.reference ?? transfer.reference,
          date: dto.date ? new Date(dto.date) : transfer.date,
          status: targetStatus,
          note: dto.note,
          fromDepartment: dto.fromDepartment ?? null,
          toDepartment: dto.toDepartment ?? null,
          shipping: dto.shipping != null ? D(dto.shipping) : null,
          total,
          totalTax,
          attachmentUrl: dto.attachmentUrl ?? null,
          grandTotal,
          items: { create: lines },
        },
        include: { items: true },
      });
    });
  }

  /**
   * Outbound leg: remove each line's quantity from the SOURCE branch INSIDE a tx.
   * A batch-linked line (EZHT parity) draws from that exact batch — `consume`
   * validates qty ≤ the batch's available quantity (the per-batch guard) — and the
   * warehouse total is moved in lock-step. `reverse` undoes a prior outbound
   * (restores the batch + warehouse; never blocked, mirroring adjustment reversal).
   * A line with no batchId falls back to product-level stock (legacy compatibility).
   */
  private async stockOut(
    tx: Prisma.TransactionClient,
    tenantId: string,
    fromBranchId: string,
    lines: StockMovementLine[],
    reverse = false,
  ): Promise<void> {
    for (const l of lines) {
      const qty = D(l.quantity);
      if (l.batchId) {
        if (reverse) {
          await this.batchService.applyAdjustmentDelta(
            tx,
            {
              tenantId,
              branchId: fromBranchId,
              productId: l.productId,
              batchId: l.batchId,
              delta: qty,
            },
            { allowNegative: true },
          );
        } else {
          await this.batchService.consume(tx, {
            tenantId,
            branchId: fromBranchId,
            productId: l.productId,
            batchId: l.batchId,
            quantity: qty,
          });
        }
      }
      await this.stockService.applyDelta(tx, {
        tenantId,
        branchId: fromBranchId,
        productId: l.productId,
        delta: reverse ? qty : qty.negated(),
        allowNegative: reverse,
      });
    }
  }

  /**
   * Inbound leg: add each line's quantity to the DESTINATION branch INSIDE a tx.
   * A batch-linked line (re)creates the destination batch PRESERVING batch no /
   * serial / expiry / cost (EZHT inserts a receiving row at the destination
   * warehouse); if a matching batch already exists there it is incremented. The
   * warehouse total moves in lock-step. `reverse` undoes a prior inbound.
   */
  private async stockIn(
    tx: Prisma.TransactionClient,
    tenantId: string,
    toBranchId: string,
    lines: StockMovementLine[],
    reverse = false,
  ): Promise<void> {
    for (const l of lines) {
      const qty = D(l.quantity);
      const cost = l.cost != null ? D(l.cost) : undefined;
      if (l.batchId) {
        const dest = await tx.inventoryProductBatch.findFirst({
          where: {
            tenantId,
            branchId: toBranchId,
            productId: l.productId,
            batchNo: l.batchNo ?? null,
            serialNo: l.productSerial ?? null,
            expiryDate: l.expiryDate ?? null,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (reverse) {
          if (dest) {
            await this.batchService.applyAdjustmentDelta(
              tx,
              {
                tenantId,
                branchId: toBranchId,
                productId: l.productId,
                batchId: dest.id,
                delta: qty.negated(),
              },
              { allowNegative: true },
            );
          }
        } else if (dest) {
          await this.batchService.applyAdjustmentDelta(tx, {
            tenantId,
            branchId: toBranchId,
            productId: l.productId,
            batchId: dest.id,
            delta: qty,
          });
        } else {
          await this.batchService.createBatch(tx, {
            tenantId,
            branchId: toBranchId,
            productId: l.productId,
            batchNo: l.batchNo ?? null,
            serialNo: l.productSerial ?? null,
            expiryDate: l.expiryDate ?? null,
            quantity: qty,
            cost: cost ?? null,
          });
        }
      }
      await this.stockService.applyDelta(tx, {
        tenantId,
        branchId: toBranchId,
        productId: l.productId,
        delta: reverse ? qty.negated() : qty,
        cost: reverse ? undefined : cost,
        allowNegative: reverse,
      });
    }
  }

  /** Send: remove stock from the source branch (batch-aware). Only valid when PENDING. */
  async send(id: string, tenantId: string) {
    const transfer = await this.findById(id, tenantId);
    if (transfer.status !== 'PENDING') {
      throw new InvalidTransferStateException(transfer.status, 'send');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.stockOut(tx, tenantId, transfer.fromBranchId, transfer.items);
      return tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT' },
        include: { items: true },
      });
    });
  }

  /** Receive: add stock to the destination branch (batch-aware). Only valid when IN_TRANSIT. */
  async receive(id: string, tenantId: string) {
    const transfer = await this.findById(id, tenantId);
    if (transfer.status !== 'IN_TRANSIT') {
      throw new InvalidTransferStateException(transfer.status, 'receive');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.stockIn(tx, tenantId, transfer.toBranchId, transfer.items);
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
