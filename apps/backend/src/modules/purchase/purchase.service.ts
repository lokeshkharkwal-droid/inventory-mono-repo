import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { PaginatedResult } from '../../common/dto/response.dto';
import { SupplierService } from '../supplier/supplier.service';
import { ProductService } from '../product/product.service';
import { ProductStockService } from '../product/product-stock.service';
import { ProductBatchService } from '../product/product-batch.service';
import { NumberingService } from '../settings/numbering.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
import {
  BranchRequiredException,
  VariantNotFoundException,
} from '../product/exceptions/product.exceptions';
import {
  CreatePurchaseDto,
  PurchasePaymentInputDto,
} from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import {
  CreatePurchasePaymentDto,
  UpdatePurchasePaymentDto,
  CreatePurchaseExpenseDto,
  SupplierBulkPaymentDto,
} from './dto/payment.dto';
import { ImportPurchasesDto } from './dto/import-purchases.dto';
import {
  ImportPurchaseDocumentDto,
  PurchaseImportRowDto,
} from './dto/import-purchase-document.dto';
import {
  PaymentExceedsBalanceException,
  PurchaseLockedException,
  PurchaseNotFoundException,
} from './exceptions/purchase.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import {
  computeOrderTotals,
  derivePaymentStatus,
  type ComputedOrder,
} from '../../common/utils/order-totals.util';
import {
  resolveWarehouseDetail,
  resolveUserName,
} from '../../common/utils/party-detail.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

type PersistedPurchaseLine =
  Prisma.InventoryPurchaseItemCreateWithoutPurchaseInput & {
    productId: string;
    quantity: Prisma.Decimal;
    /** Free (non-chargeable) units received — added to stock, excluded from totals. */
    freeQuantity: Prisma.Decimal;
    cost: Prisma.Decimal;
    batchNo?: string | null;
    expiryDate?: Date | null;
  };

/** Stock received for a line = chargeable quantity + free (bonus) units (EZHT). */
const receivedQty = (l: PersistedPurchaseLine): Prisma.Decimal =>
  l.quantity.add(l.freeQuantity ?? 0);

/**
 * Purchases — goods receipts from suppliers (CLAUDE.md §4.7). Creating a
 * RECEIVED purchase adds stock (inbound, AVCO) at the active branch. Totals are
 * computed server-side by {@link computeOrderTotals} (discount %/fixed, tax
 * incl/excl, GST split, order discount/tax/shipping, grand total, paid/status).
 */
@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly stockService: ProductStockService,
    private readonly batchService: ProductBatchService,
    private readonly numbering: NumberingService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly usersClient: KalnosticsUsersClient,
  ) {}

  /** Validate a client-supplied warehouse against the tenant, else active branch. */
  private async resolveWarehouse(
    branchId: string | null,
    warehouseId?: string,
  ): Promise<string> {
    if (warehouseId && warehouseId !== branchId) {
      await this.branchClient.findById(warehouseId);
      return warehouseId;
    }
    if (!branchId) throw new BranchRequiredException();
    return branchId;
  }

  /** Resolve + snapshot products and compute the money breakdown. */
  private async buildPurchaseLines(
    tenantId: string,
    dto: CreatePurchaseDto,
  ): Promise<{
    lines: PersistedPurchaseLine[];
    totals: ComputedOrder;
    stockTracked: boolean[];
  }> {
    const resolved = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        // A line may target a specific variant (EZHT option) — validate ownership.
        if (
          item.optionId &&
          !product.variants.some((v) => v.id === item.optionId)
        ) {
          throw new VariantNotFoundException(item.optionId, product.id);
        }
        return { item, product };
      }),
    );

    const totals = computeOrderTotals({
      lines: resolved.map(({ item }) => ({
        quantity: item.quantity,
        unitPrice: item.cost,
        discount: item.discount,
        taxRatePercent: item.taxRate ?? 0,
        taxInclusive: item.taxInclusive ?? false,
      })),
      orderDiscount: dto.orderDiscount,
      orderTaxPercent: dto.orderTax ?? 0,
      shipping: dto.shipping ?? 0,
      interState: dto.interState ?? false,
    });

    const lines: PersistedPurchaseLine[] = resolved.map(
      ({ item, product }, i) => {
        const c = totals.lines[i]!;
        // Free units = free packs × pack size (EZHT `free_quantity`); bonus stock
        // that is received but never charged (excluded from totals/subtotal).
        const freeQuantity =
          item.freePackQuantity != null && item.packSize != null
            ? D(item.freePackQuantity).mul(item.packSize)
            : D(0);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          optionId: item.optionId,
          quantity: c.quantity,
          freeQuantity,
          cost: D(item.cost),
          realUnitCost: c.realUnitPrice,
          netUnitCost: c.netUnitPrice,
          mrp: item.mrp != null ? D(item.mrp) : null,
          taxRate: D(item.taxRate ?? 0),
          taxAmount: c.taxAmount,
          taxMethod: item.taxInclusive ? '1' : '0',
          discount: c.discount,
          discountSpec: item.discount,
          subtotal: c.subtotal,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          hsnCode: item.hsnCode,
          partNo: item.partNo,
          packSize: item.packSize != null ? D(item.packSize) : null,
          packQuantity: item.packQuantity != null ? D(item.packQuantity) : null,
          freePackQuantity:
            item.freePackQuantity != null ? D(item.freePackQuantity) : null,
          igst: c.igst,
          cgst: c.cgst,
          sgst: c.sgst,
        };
      },
    );

    const stockTracked = resolved.map(({ product }) => product.isStockTracked);
    return { lines, totals, stockTracked };
  }

  /** Header money/meta columns shared by create + update. */
  private purchaseHeaderData(
    dto: CreatePurchaseDto,
    totals: ComputedOrder,
    date: Date,
  ) {
    const dueDate =
      dto.paymentTerm != null
        ? new Date(date.getTime() + dto.paymentTerm * 86_400_000)
        : null;
    return {
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      orderDiscount: totals.orderDiscount,
      orderDiscountSpec: dto.orderDiscount,
      orderTax: totals.orderTax,
      orderTaxId: dto.orderTaxId,
      orderTaxSpec: dto.orderTax != null ? String(dto.orderTax) : null,
      totalTax: totals.totalTax,
      shipping: totals.shipping,
      roundoff: totals.roundoff,
      grandTotal: totals.grandTotal,
      totalItems: Math.round(totals.totalItems.toNumber()),
      paymentTerm: dto.paymentTerm,
      dueDate,
      gstNumber: dto.gstNumber,
      gstState: dto.gstState,
      taxMethod: dto.interState ? 'igst' : 'cgst+sgst',
      igst: totals.igst,
      cgst: totals.cgst,
      sgst: totals.sgst,
      attachmentUrl: dto.attachmentUrl,
      note: dto.note,
      isBloodDonation: dto.isBloodDonation ?? false,
      donorName: dto.donorName,
    };
  }

  /** Create a purchase and (when RECEIVED) apply inbound stock atomically. */
  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreatePurchaseDto,
    actorId?: string,
  ) {
    const warehouse = await this.resolveWarehouse(branchId, dto.warehouseId);
    await this.supplierService.findById(dto.supplierId, tenantId);

    const { lines, totals, stockTracked } = await this.buildPurchaseLines(
      tenantId,
      dto,
    );
    const status = dto.status ?? 'RECEIVED';
    const date = dto.date ? new Date(dto.date) : new Date();
    const reference =
      dto.reference ??
      (await this.numbering.next(tenantId, 'purchase', warehouse));
    const { paid, paymentStatus } = this.resolvePaymentPlan(
      dto.payment,
      totals.grandTotal,
    );

    return this.prisma.withTenant(tenantId, async (tx) => {
      const purchase = await tx.inventoryPurchase.create({
        data: {
          tenantId,
          branchId: warehouse,
          supplierId: dto.supplierId,
          reference,
          date,
          status,
          ...this.purchaseHeaderData(dto, totals, date),
          paid,
          paymentStatus,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      });

      if (paid.gt(0)) {
        await tx.inventoryPurchasePayment.create({
          data: this.paymentRow(
            tenantId,
            purchase.id,
            paid,
            dto.payment,
            actorId,
          ),
        });
      }

      // Apply inbound stock only when the goods are received. Stock-tracked
      // products get both an aggregate inbound AND a batch row (always — batchNo/
      // expiry may be null) so the batch ledger always backs the on-hand quantity.
      if (status === 'RECEIVED') {
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i]!;
          if (!stockTracked[i]) continue;
          const inbound = receivedQty(l);
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: inbound,
            cost: l.cost,
          });
          await this.batchService.createBatch(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            batchNo: l.batchNo,
            expiryDate: l.expiryDate,
            quantity: inbound,
            cost: l.cost,
            sourcePurchaseId: purchase.id,
          });
          // Increment the specific variant's branch stock when the line targets one
          // (EZHT `warehouses_products_variants`), kept in lock-step with the total.
          if (l.optionId) {
            await this.stockService.applyVariantDelta(tx, {
              tenantId,
              branchId: warehouse,
              variantId: l.optionId,
              delta: inbound,
              cost: l.cost,
            });
          }
        }
      }

      return purchase;
    });
  }

  private resolvePaymentPlan(
    payment: PurchasePaymentInputDto | undefined,
    grandTotal: Prisma.Decimal,
  ): { paid: Prisma.Decimal; paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' } {
    const ps = payment?.paymentStatus?.toLowerCase();
    let paid = D(0);
    if (ps === 'paid') paid = grandTotal;
    else if (ps === 'partial') paid = D(payment?.amount ?? 0);
    return { paid, paymentStatus: derivePaymentStatus(paid, grandTotal) };
  }

  private paymentRow(
    tenantId: string,
    purchaseId: string,
    amount: Prisma.Decimal,
    payment: PurchasePaymentInputDto | undefined,
    actorId?: string,
  ): Prisma.InventoryPurchasePaymentUncheckedCreateInput {
    return {
      tenantId,
      purchaseId,
      amount,
      method: (payment?.paidBy ?? 'CASH').toUpperCase(),
      reference: payment?.reference,
      date: new Date(),
      note: payment?.note,
      chequeNo: payment?.chequeNo,
      ccNo: payment?.ccNo,
      ccHolder: payment?.ccHolder,
      ccType: payment?.ccType,
      ccMonth: payment?.ccMonth,
      ccYear: payment?.ccYear,
      createdBy: actorId,
    };
  }

  /**
   * Bulk import purchases (preview or commit). Each row is one full document;
   * reuses {@link create} so stock + totals behave exactly like a manual entry.
   */
  async import(
    tenantId: string,
    branchId: string | null,
    dto: ImportPurchasesDto,
    actorId?: string,
  ): Promise<ImportSummary> {
    return runBulkImport<CreatePurchaseDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.reference ?? row.supplierId,
      validate: (row) => {
        if (!row.supplierId) throw new Error('Missing supplierId');
        if (!row.items?.length)
          throw new Error('At least one line item required');
      },
      create: (row) => this.create(tenantId, branchId, row, actorId),
    });
  }

  /**
   * EZHT single-document purchase import (`Purchases::purchase_import`): one header
   * form + a CSV of line items → one purchase. Per row: resolve the product by
   * code → name (creating it when missing, user-confirmed "full auto-create"),
   * derive the unit cost/mrp/quantity from the pack columns, and the line tax from
   * CGST+SGST. Validation errors are reported with the CSV line number. `dryRun`
   * validates + previews (new-product count) without persisting anything.
   */
  async importDocument(
    tenantId: string,
    branchId: string | null,
    dto: ImportPurchaseDocumentDto,
    actorId?: string,
  ) {
    await this.supplierService.findById(dto.supplierId, tenantId);
    const errors: string[] = [];
    const items: CreatePurchaseDto['items'] = [];
    let newProducts = 0;

    for (let idx = 0; idx < dto.rows.length; idx++) {
      const row = dto.rows[idx]!;
      const line = idx + 2; // row 1 is the CSV header
      const code = row.code?.trim();
      const name = row.name?.trim();
      if (!code && !name) {
        errors.push(`Product code or name is required. Line No. ${line}`);
        continue;
      }
      const expiry = this.parseImportExpiry(row.expiry);
      if (!expiry) {
        errors.push(`A valid expiry date is required. Line No. ${line}`);
        continue;
      }
      if (!row.serial?.trim()) {
        errors.push(`Batch No. should not be empty. Line No. ${line}`);
        continue;
      }
      const packSize = Number(row.packSize) || 0;
      if (packSize <= 0) {
        errors.push(`Pack size should not be empty. Line No. ${line}`);
        continue;
      }
      if (row.packCost == null || row.packCost.trim() === '') {
        errors.push(`Pack cost should not be empty. Line No. ${line}`);
        continue;
      }
      const packCost = Number(row.packCost);
      if (!Number.isFinite(packCost) || packCost < 0) {
        errors.push(`Pack cost is invalid. Line No. ${line}`);
        continue;
      }
      const packQuantity =
        Number(row.packQuantity) || Number(row.quantity) || 0;
      if (packQuantity <= 0) {
        errors.push(`Pack quantity should not be empty. Line No. ${line}`);
        continue;
      }
      const freePackQuantity = Number(row.freePackQuantity) || 0;

      const resolved = await this.resolveImportProduct(
        tenantId,
        row,
        !dto.dryRun,
      );
      if (resolved.created) newProducts++;

      const netUnitCost = packCost / packSize;
      const mrp = row.packMrp ? Number(row.packMrp) / packSize : undefined;
      const taxRate = (Number(row.cgst) || 0) + (Number(row.sgst) || 0);

      if (resolved.id) {
        items.push({
          productId: resolved.id,
          quantity: packQuantity * packSize,
          cost: netUnitCost,
          discount: row.discount || undefined,
          taxRate,
          batchNo: row.serial.trim(),
          expiryDate: expiry.toISOString(),
          mrp,
          packSize,
          packQuantity,
          freePackQuantity,
          hsnCode: row.hsnCode,
        });
      }
    }

    if (errors.length) {
      throw new KaltrosException(
        'PURCHASE_IMPORT_FAILED',
        errors[0]!,
        { errors },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.dryRun) {
      return {
        dryRun: true as const,
        rows: dto.rows.length,
        newProducts,
        items: items.length,
      };
    }

    const createDto: CreatePurchaseDto = {
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId,
      reference: dto.reference,
      date: dto.date,
      status: dto.status as CreatePurchaseDto['status'],
      orderTax: dto.orderTax,
      orderDiscount: dto.orderDiscount,
      shipping: dto.shipping,
      interState: dto.interState,
      note: dto.note,
      attachmentUrl: dto.attachmentUrl,
      items,
    };
    return this.create(tenantId, branchId, createDto, actorId);
  }

  /** Parse an EZHT expiry cell (MM-YYYY → end of month, or any parseable date). */
  private parseImportExpiry(raw?: string): Date | null {
    const s = raw?.trim();
    if (!s) return null;
    const mm = /^(\d{1,2})[-/](\d{4})$/.exec(s);
    if (mm) {
      const month = Number(mm[1]);
      const year = Number(mm[2]);
      if (month >= 1 && month <= 12) return new Date(year, month, 0); // last day
    }
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  /**
   * Resolve an import row to a product id: match by code → name, else (on commit)
   * create a tenant product (default category, manufacturer auto-created, pack
   * cost/mrp seeded). In dry-run (`commit=false`) a would-be-new product returns a
   * null id and is only counted.
   */
  private async resolveImportProduct(
    tenantId: string,
    row: PurchaseImportRowDto,
    commit: boolean,
  ): Promise<{ id: string | null; created: boolean }> {
    const code = row.code?.trim();
    const name = row.name?.trim();
    if (code) {
      const byCode = await this.prisma.inventoryProduct.findFirst({
        where: { tenantId, code, deletedAt: null },
        select: { id: true },
      });
      if (byCode) return { id: byCode.id, created: false };
    }
    if (name) {
      const byName = await this.prisma.inventoryProduct.findFirst({
        where: { tenantId, name, deletedAt: null },
        select: { id: true },
      });
      if (byName) return { id: byName.id, created: false };
    }
    if (!commit) return { id: null, created: true };

    const categoryId = await this.resolveImportCategory(tenantId);
    const manufacturerId = row.manufacturer?.trim()
      ? await this.resolveImportManufacturer(tenantId, row.manufacturer.trim())
      : undefined;
    const packSize = row.packSize ? Number(row.packSize) : undefined;
    const theCode = code ?? name!;
    const created = await this.productService.create(tenantId, {
      code: theCode,
      name: name ?? theCode,
      categoryId,
      manufacturerId,
      type: 'standard',
      packSize: row.packSize || undefined,
      packCost: row.packCost ? Number(row.packCost) : undefined,
      packMrp: row.packMrp ? Number(row.packMrp) : undefined,
      cost:
        packSize && row.packCost ? Number(row.packCost) / packSize : undefined,
      price:
        packSize && row.packMrp ? Number(row.packMrp) / packSize : undefined,
      hsnCode: row.hsnCode,
      unitType: row.packUnit,
    });
    return { id: created.id, created: true };
  }

  /** Find-or-create the catch-all "Imported" category for auto-created products. */
  private async resolveImportCategory(tenantId: string): Promise<string> {
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { tenantId, code: 'IMPORTED', deletedAt: null },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventoryCategory.create({
      data: { tenantId, code: 'IMPORTED', name: 'Imported' },
      select: { id: true },
    });
    return created.id;
  }

  /** Find-or-create a manufacturer by name (EZHT auto-creates on import). */
  private async resolveImportManufacturer(
    tenantId: string,
    name: string,
  ): Promise<string> {
    const existing = await this.prisma.inventoryManufacturer.findFirst({
      where: { tenantId, name, deletedAt: null },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventoryManufacturer.create({
      data: { tenantId, name },
      select: { id: true },
    });
    return created.id;
  }

  /** Paginated, filterable purchase list. */
  async findAll(
    tenantId: string,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.warehouseId) where.branchId = query.warehouseId;
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [rows, total, returnedSet] = await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.inventoryPurchase.findMany({
          where,
          include: { supplier: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        const count = await tx.inventoryPurchase.count({ where });
        // Which of this page's purchases already have a return (EZHT edit/delete lock).
        const ids = rows.map((r) => r.id);
        const rets = ids.length
          ? await tx.inventoryPurchaseReturn.findMany({
              where: { purchaseId: { in: ids }, tenantId, deletedAt: null },
              select: { purchaseId: true },
              distinct: ['purchaseId'],
            })
          : [];
        return [rows, count, new Set(rets.map((r) => r.purchaseId))] as const;
      },
    );
    // Surface edit/delete eligibility so the UI can disable the actions.
    const data = rows.map((r) => ({
      ...r,
      hasReturn: returnedSet.has(r.id),
      hasPayment: D(r.paid).gt(0),
    }));
    return { data, total, page, limit };
  }

  /** Fetch one purchase with items, payments, and supplier. */
  async findById(id: string, tenantId: string) {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
    if (!purchase) throw new PurchaseNotFoundException(id);
    return purchase;
  }

  /**
   * Fetch one purchase enriched for the detail modal (legacy `purchases/modal_view`):
   * the fuller supplier contact/address + GST, the warehouse (branch) name/address,
   * and the created-by staff name resolved via the kalnostics integration. Kept
   * separate from {@link findById} — which the write paths reuse — so those stay
   * fast and independent of the integration being reachable (all lookups here are
   * best-effort and degrade to `null` on failure).
   */
  async getDetail(id: string, tenantId: string) {
    const purchase = await this.findById(id, tenantId);
    const [supplier, warehouse, createdByName, returnCount] = await Promise.all(
      [
        this.supplierService
          .findById(purchase.supplierId, tenantId)
          .catch(() => null),
        resolveWarehouseDetail(this.branchClient, purchase.branchId),
        resolveUserName(this.usersClient, purchase.createdBy),
        this.countReturns(id, tenantId),
      ],
    );
    return {
      ...purchase,
      supplier: supplier ?? purchase.supplier,
      warehouse,
      createdByName,
      hasReturn: returnCount > 0,
      hasPayment: D(purchase.paid).gt(0),
    };
  }

  /** Count non-deleted returns referencing a purchase (EZHT edit/delete lock). */
  private countReturns(purchaseId: string, tenantId: string): Promise<number> {
    return this.prisma.inventoryPurchaseReturn.count({
      where: { purchaseId, tenantId, deletedAt: null },
    });
  }

  /**
   * Edit a purchase (full line replacement). Re-syncs stock: reverses the old
   * inbound (if RECEIVED), swaps items, and applies the new inbound. Totals
   * recomputed; payments preserved, status re-derived. Requires an `editNote`.
   */
  async update(
    id: string,
    tenantId: string,
    branchId: string | null,
    dto: CreatePurchaseDto,
  ) {
    const existing = await this.findById(id, tenantId);
    // EZHT: a purchase that has been (partly) returned is locked against editing.
    if ((await this.countReturns(id, tenantId)) > 0) {
      throw new PurchaseLockedException(
        'This purchase has a return and can no longer be edited.',
        { id },
      );
    }
    const warehouse = await this.resolveWarehouse(
      branchId,
      dto.warehouseId ?? existing.branchId,
    );
    await this.supplierService.findById(dto.supplierId, tenantId);

    const { lines, totals, stockTracked } = await this.buildPurchaseLines(
      tenantId,
      dto,
    );
    const newStatus =
      dto.status ?? (existing.status as 'RECEIVED' | 'ORDERED' | 'PENDING');
    const date = dto.date ? new Date(dto.date) : existing.date;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Reverse previous inbound if the purchase had added stock. Also retire the
      //    batches this purchase created (consistent with the aggregate reversal).
      if (existing.status === 'RECEIVED') {
        for (const l of existing.items) {
          // Reverse the full inbound (chargeable + free units).
          const prevInbound = D(l.quantity).add(l.freeQuantity ?? 0);
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: existing.branchId,
            productId: l.productId,
            delta: prevInbound.negated(),
            allowNegative: true,
          });
          // Reverse the variant's branch stock too (allow negative — a reversal
          // must never be blocked).
          if (l.optionId) {
            await this.stockService.applyVariantDelta(tx, {
              tenantId,
              branchId: existing.branchId,
              variantId: l.optionId,
              delta: prevInbound.negated(),
              allowNegative: true,
            });
          }
        }
        await tx.inventoryProductBatch.updateMany({
          where: { sourcePurchaseId: id, tenantId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
      // 2. Replace line items.
      await tx.inventoryPurchaseItem.deleteMany({ where: { purchaseId: id } });
      // 3. Apply new inbound if the edited purchase is RECEIVED (batch per line).
      if (newStatus === 'RECEIVED') {
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i]!;
          if (!stockTracked[i]) continue;
          const inbound = receivedQty(l);
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            delta: inbound,
            cost: l.cost,
          });
          await this.batchService.createBatch(tx, {
            tenantId,
            branchId: warehouse,
            productId: l.productId,
            batchNo: l.batchNo,
            expiryDate: l.expiryDate,
            quantity: inbound,
            cost: l.cost,
            sourcePurchaseId: id,
          });
          if (l.optionId) {
            await this.stockService.applyVariantDelta(tx, {
              tenantId,
              branchId: warehouse,
              variantId: l.optionId,
              delta: inbound,
              cost: l.cost,
            });
          }
        }
      }
      const paid = D(existing.paid);
      const paymentStatus = derivePaymentStatus(paid, totals.grandTotal);
      return tx.inventoryPurchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          branchId: warehouse,
          date,
          status: newStatus,
          ...this.purchaseHeaderData(dto, totals, date),
          editNote: dto.editNote,
          isEdited: true,
          paymentStatus,
          items: { create: lines },
        },
        include: { items: true, payments: { where: { deletedAt: null } } },
      });
    });
  }

  /** Record a payment, update paid + payment status atomically. */
  async addPayment(
    id: string,
    tenantId: string,
    dto: CreatePurchasePaymentDto,
    actorId?: string,
  ) {
    const purchase = await this.findById(id, tenantId);
    const amount = D(dto.amount);
    const outstanding = D(purchase.grandTotal).sub(purchase.paid);
    if (amount.gt(outstanding)) {
      throw new PaymentExceedsBalanceException(
        outstanding.toNumber(),
        amount.toNumber(),
      );
    }
    const newPaid = D(purchase.paid).add(amount);
    const paymentStatus = derivePaymentStatus(newPaid, D(purchase.grandTotal));

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.create({
        data: {
          tenantId,
          purchaseId: id,
          amount,
          method: (dto.method ?? 'CASH').toUpperCase(),
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          chequeNo: dto.chequeNo,
          ccNo: dto.ccNo,
          ccHolder: dto.ccHolder,
          ccType: dto.ccType,
          ccMonth: dto.ccMonth,
          ccYear: dto.ccYear,
          attachmentUrl: dto.attachmentUrl,
          createdBy: actorId,
        },
      });
      return tx.inventoryPurchase.update({
        where: { id },
        data: { paid: newPaid, paymentStatus },
        include: {
          payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        },
      });
    });
  }

  /** Edit an existing payment, then recompute paid + status from live payments. */
  async editPayment(
    id: string,
    paymentId: string,
    tenantId: string,
    dto: UpdatePurchasePaymentDto,
  ) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventoryPurchasePayment.findFirst({
      where: { id: paymentId, purchaseId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new PurchaseNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.update({
        where: { id: paymentId },
        data: {
          amount: dto.amount != null ? D(dto.amount) : undefined,
          method: dto.method ? dto.method.toUpperCase() : undefined,
          reference: dto.reference,
          date: dto.date ? new Date(dto.date) : undefined,
          note: dto.note,
          chequeNo: dto.chequeNo,
          ccNo: dto.ccNo,
          ccHolder: dto.ccHolder,
          ccType: dto.ccType,
          ccMonth: dto.ccMonth,
          ccYear: dto.ccYear,
          attachmentUrl: dto.attachmentUrl,
        },
      });
      return this.recomputePaid(tx, id);
    });
  }

  /** Soft-delete a payment, then recompute paid + status. */
  async deletePayment(id: string, paymentId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const existing = await this.prisma.inventoryPurchasePayment.findFirst({
      where: { id: paymentId, purchaseId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new PurchaseNotFoundException(paymentId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryPurchasePayment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
      return this.recomputePaid(tx, id);
    });
  }

  /** Recompute `paid` + `paymentStatus` from the purchase's live payments. */
  private async recomputePaid(tx: Prisma.TransactionClient, id: string) {
    const agg = await tx.inventoryPurchasePayment.aggregate({
      where: { purchaseId: id, deletedAt: null },
      _sum: { amount: true },
    });
    const purchase = await tx.inventoryPurchase.findUniqueOrThrow({
      where: { id },
      select: { grandTotal: true },
    });
    const paid = agg._sum.amount ?? D(0);
    const paymentStatus = derivePaymentStatus(paid, D(purchase.grandTotal));
    return tx.inventoryPurchase.update({
      where: { id },
      data: { paid, paymentStatus },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
  }

  // ── Supplier payments (legacy Purchases::supplier_payments) ───────────────────

  /**
   * Supplier-payments screen listing (EZHT `getSupplierPayments`): a paginated,
   * filterable list of purchases (any supplier) with grand total / paid / balance /
   * payment status. Filters: supplier, reference, date range. Returns one row per
   * purchase so the UI can multi-select a supplier's rows and allocate a payment.
   */
  async supplierPaymentsList(
    tenantId: string,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryPurchaseWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [rows, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryPurchase.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryPurchase.count({ where })] as const;
    });
    const data = rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      date: r.date,
      status: r.status,
      grandTotal: r.grandTotal,
      paid: r.paid,
      balance: D(r.grandTotal).sub(r.paid),
      paymentStatus: r.paymentStatus,
      supplier: r.supplier,
    }));
    return { data, total, page, limit };
  }

  /** List a supplier's purchases that still have an outstanding balance. */
  async supplierOutstanding(supplierId: string, tenantId: string) {
    await this.supplierService.findById(supplierId, tenantId);
    const rows = await this.prisma.inventoryPurchase.findMany({
      where: {
        tenantId,
        supplierId,
        deletedAt: null,
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        status: { not: 'RETURNED' },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        reference: true,
        date: true,
        status: true,
        grandTotal: true,
        paid: true,
        paymentStatus: true,
      },
    });
    const purchases = rows.map((p) => ({
      ...p,
      balance: D(p.grandTotal).sub(p.paid),
    }));
    const totalDue = purchases.reduce((s, p) => s.add(p.balance), D(0));
    return { purchases, totalDue };
  }

  /**
   * Record one bulk supplier payment and allocate it across the supplier's
   * outstanding purchases (explicit allocations, or oldest-first otherwise).
   * Creates an {@link InventorySupplierPayment} header plus a per-purchase
   * {@link InventoryPurchasePayment} allocation, updating each purchase's
   * paid + payment status.
   */
  async addSupplierPayment(
    tenantId: string,
    dto: SupplierBulkPaymentDto,
    actorId?: string,
  ) {
    await this.supplierService.findById(dto.supplierId, tenantId);
    const { purchases } = await this.supplierOutstanding(
      dto.supplierId,
      tenantId,
    );
    const byId = new Map(purchases.map((p) => [p.id, p]));

    // Resolve allocations: explicit, or spread the amount oldest-first.
    const allocations: { purchaseId: string; amount: Prisma.Decimal }[] = [];
    if (dto.allocations?.length) {
      for (const a of dto.allocations) {
        const p = byId.get(a.purchaseId);
        if (!p) throw new PurchaseNotFoundException(a.purchaseId);
        const amount = Prisma.Decimal.min(D(a.amount), p.balance);
        if (amount.gt(0)) allocations.push({ purchaseId: p.id, amount });
      }
    } else {
      let remaining = D(dto.amount);
      for (const p of purchases) {
        if (remaining.lte(0)) break;
        const amount = Prisma.Decimal.min(remaining, p.balance);
        if (amount.gt(0)) {
          allocations.push({ purchaseId: p.id, amount });
          remaining = remaining.sub(amount);
        }
      }
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      const header = await tx.inventorySupplierPayment.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          amount: D(dto.amount),
          method: (dto.method ?? 'CASH').toUpperCase(),
          reference: dto.reference,
          note: dto.note,
          date: dto.date ? new Date(dto.date) : new Date(),
          createdBy: actorId,
        },
      });

      for (const a of allocations) {
        await tx.inventoryPurchasePayment.create({
          data: {
            tenantId,
            purchaseId: a.purchaseId,
            amount: a.amount,
            method: (dto.method ?? 'CASH').toUpperCase(),
            reference: dto.reference,
            date: header.date,
            note: dto.note,
            chequeNo: dto.chequeNo,
            supplierPaymentId: header.id,
            createdBy: actorId,
          },
        });
        await this.recomputePaid(tx, a.purchaseId);
      }

      return { ...header, allocations };
    });
  }

  // ── Expenses (freight / insurance / misc) ──────────────────────────────────────
  async addExpense(
    id: string,
    tenantId: string,
    dto: CreatePurchaseExpenseDto,
    actorId?: string,
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryPurchaseExpense.create({
      data: {
        tenantId,
        purchaseId: id,
        category: dto.category,
        amount: D(dto.amount),
        reference: dto.reference,
        note: dto.note,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actorId,
      },
    });
  }

  async listExpenses(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    const expenses = await this.prisma.inventoryPurchaseExpense.findMany({
      where: { purchaseId: id, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    const total = expenses.reduce((s, e) => s.add(e.amount), D(0));
    return { expenses, total };
  }

  /**
   * Soft-delete a purchase (EZHT `Purchases::delete`). Blocked when the purchase
   * has recorded payments or a return. When it had added stock (RECEIVED), the
   * inbound is reversed (aggregate + variant) and this purchase's batches retired,
   * mirroring the edit-reversal path.
   */
  async remove(id: string, tenantId: string) {
    const existing = await this.findById(id, tenantId);
    if (D(existing.paid).gt(0)) {
      throw new PurchaseLockedException(
        'This purchase has payments and cannot be deleted. Remove the payments first.',
        { id },
      );
    }
    if ((await this.countReturns(id, tenantId)) > 0) {
      throw new PurchaseLockedException(
        'This purchase has a return and cannot be deleted.',
        { id },
      );
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      if (existing.status === 'RECEIVED') {
        for (const l of existing.items) {
          const prevInbound = D(l.quantity).add(l.freeQuantity ?? 0);
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: existing.branchId,
            productId: l.productId,
            delta: prevInbound.negated(),
            allowNegative: true,
          });
          if (l.optionId) {
            await this.stockService.applyVariantDelta(tx, {
              tenantId,
              branchId: existing.branchId,
              variantId: l.optionId,
              delta: prevInbound.negated(),
              allowNegative: true,
            });
          }
        }
        await tx.inventoryProductBatch.updateMany({
          where: { sourcePurchaseId: id, tenantId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
      return tx.inventoryPurchase.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true, deletedAt: true },
      });
    });
  }
}
