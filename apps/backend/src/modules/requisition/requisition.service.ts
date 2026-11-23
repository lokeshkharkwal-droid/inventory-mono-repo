import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from '../product/product.service';
import { BatchNotFoundException } from '../product/exceptions/batch.exceptions';
import { NumberingService } from '../settings/numbering.service';
import { SettingsService } from '../settings/settings.service';
import { TransferService } from '../transfer/transfer.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsDepartmentClient } from '../../integration/clients/kalnostics-department.client';
import { KalnosticsPrintTemplateClient } from '../../integration/clients/kalnostics-print-template.client';
import {
  computeOrderTotals,
  type ComputedOrder,
} from '../../common/utils/order-totals.util';
import {
  ApproveRequisitionDto,
  ConvertToTransferDto,
  CreateRequisitionDto,
  RejectRequisitionDto,
  RequisitionQueryDto,
} from './dto/requisition.dto';
import {
  InvalidRequisitionStateException,
  RequisitionAlreadyConvertedException,
  RequisitionBranchRequiredException,
  RequisitionNotFoundException,
  RequisitionSourceBranchRequiredException,
} from './exceptions/requisition.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** A line ready to persist, zipped from the DTO + computed money. */
type PersistedRequisitionLine =
  Prisma.InventoryRequisitionItemCreateWithoutRequisitionInput;

/**
 * Internal requisitions — an inter-branch stock-request document
 * (PENDING → APPROVED/REJECTED → RECEIVED/TRANSFERRED). A requisition records a
 * request from a destination/requesting branch (`branchId`, the active branch)
 * to a source branch (`fromBranchId`). Line + order totals (discount %/fixed,
 * tax, order discount/tax/shipping, grand total) are computed server-side by
 * {@link computeOrderTotals}. The requisition itself moves no stock — fulfilment
 * is done by converting an approved requisition into a transfer.
 */
@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly numbering: NumberingService,
    private readonly transferService: TransferService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly departmentClient: KalnosticsDepartmentClient,
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
   * Render this requisition through the kalnostics print engine's
   * `inventory_requisition` template type and return the raw PDF bytes. The
   * caller's bearer token (tenant + active branch) selects the configured
   * template; falls back to the first active template of that type.
   */
  async renderRequisitionPdf(
    id: string,
    tenantId: string,
  ): Promise<{ pdf: Buffer; reference: string }> {
    const req = await this.findById(id, tenantId);
    const settings = await this.settingsService.get(tenantId, req.branchId);
    const money = (v: Prisma.Decimal | number | string) => D(v).toFixed(2);
    const [sourceBranch, destinationBranch] = await Promise.all([
      this.branchName(req.fromBranchId),
      this.branchName(req.branchId),
    ]);

    const variables: Record<string, unknown> = {
      requisition_number: req.reference,
      requisition_date: req.date.toISOString().slice(0, 10),
      status: req.status,
      source_branch: sourceBranch,
      destination_branch: destinationBranch,
      from_department: req.fromDepartmentName ?? '',
      to_department: req.toDepartmentName ?? '',
      biller_name: req.billerName ?? '',
      supplier_name: req.supplierName ?? '',
      customer_name: req.customerName ?? '',
      local_purchase: req.localPurchase ? 'Yes' : 'No',
      business_name: settings.businessName ?? '',
      business_address: settings.businessAddress ?? '',
      business_phone: settings.businessPhone ?? '',
      business_email: settings.businessEmail ?? '',
      subtotal: money(req.subtotal),
      product_discount: money(req.productDiscount),
      order_discount: money(req.orderDiscount),
      total_tax: money(req.totalTax),
      shipping: money(req.shipping),
      grand_total: money(req.grandTotal),
      total_items: String(req.totalItems),
      note: req.note ?? '',
    };

    const items = req.items.map((it, idx) => ({
      no: String(idx + 1),
      product_name: it.productName,
      product_code: it.productCode ?? '',
      batch_no: it.batchNo ?? '',
      serial_no: it.serialNo ?? '',
      expiry: it.expiryDate ? it.expiryDate.toISOString().slice(0, 10) : '',
      quantity: D(it.quantity).toFixed(2),
      unit_price: money(it.netUnitPrice),
      discount: money(it.discount),
      tax_rate: D(it.taxRate).toFixed(2),
      tax_amount: money(it.taxAmount),
      subtotal: money(it.subtotal),
    }));

    const pdf = await this.printTemplateClient.renderByType(
      'inventory_requisition',
      { variables, sections: { items } },
    );
    return { pdf, reference: req.reference };
  }

  /** Resolve a department name snapshot from its id (best-effort). */
  private async departmentName(id?: string): Promise<string | undefined> {
    if (!id) return undefined;
    const departments = await this.departmentClient.getOptions();
    return departments.find((d) => d.id === id)?.name;
  }

  /**
   * Resolve + snapshot each product and compute the full money breakdown.
   * Returns persist-ready line rows plus the order totals.
   */
  private async buildRequisitionLines(
    tenantId: string,
    dto: CreateRequisitionDto,
  ): Promise<{ lines: PersistedRequisitionLine[]; totals: ComputedOrder }> {
    const resolved = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        // Batch-level parity (EZHT): when a line targets a specific source batch,
        // resolve it (scoped to the source branch) and snapshot its identity so the
        // chosen batch survives requisition -> transfer conversion.
        const batch =
          item.batchId && dto.fromBranchId
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
                },
              })
            : null;
        if (item.batchId && !batch)
          throw new BatchNotFoundException(item.batchId);
        return { item, product, batch };
      }),
    );

    const totals = computeOrderTotals({
      lines: resolved.map(({ item, product }) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? Number(product.cost),
        discount: item.discount,
        taxRatePercent: item.taxRate ?? 0,
        taxInclusive: item.taxInclusive ?? false,
      })),
      orderDiscount: dto.orderDiscount,
      orderTaxPercent: dto.orderTax ?? 0,
      shipping: dto.shipping ?? 0,
    });

    const lines: PersistedRequisitionLine[] = resolved.map(
      ({ item, product, batch }, i) => {
        const c = totals.lines[i]!;
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          productType: product.type ?? null,
          optionId: item.optionId ?? null,
          batchId: batch?.id ?? null,
          batchNo: batch?.batchNo ?? item.batchNo ?? null,
          serialNo: batch?.serialNo ?? item.serialNo ?? null,
          expiryDate:
            batch?.expiryDate ??
            (item.expiryDate ? new Date(item.expiryDate) : null),
          quantity: c.quantity,
          unitPrice: D(item.unitPrice ?? product.cost),
          netUnitPrice: c.netUnitPrice,
          realUnitPrice: c.realUnitPrice,
          discount: c.discount,
          discountSpec: item.discount ?? null,
          taxRateId: item.taxRateId ?? null,
          taxRate: D(item.taxRate ?? 0),
          taxAmount: c.taxAmount,
          subtotal: c.subtotal,
        };
      },
    );

    return { lines, totals };
  }

  /** Header money/meta columns shared by create + update. */
  private headerData(dto: CreateRequisitionDto, totals: ComputedOrder) {
    const ref = dto.referral;
    return {
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      orderDiscount: totals.orderDiscount,
      orderDiscountSpec: dto.orderDiscount ?? null,
      orderTax: totals.orderTax,
      orderTaxId: dto.orderTaxId ?? null,
      totalTax: totals.totalTax,
      shipping: totals.shipping,
      grandTotal: totals.grandTotal,
      totalItems: totals.totalItems.toNumber(),
      localPurchase: dto.localPurchase ?? false,
      attachmentUrl: dto.attachmentUrl ?? null,
      // EZHT identity snapshots.
      billerId: dto.billerId ?? null,
      billerName: dto.billerName ?? null,
      supplierId: dto.supplierId ?? null,
      supplierName: dto.supplierName ?? null,
      customerId: dto.customerId ?? null,
      customerName: dto.customerName ?? null,
      // EZHT referral block.
      referralSourceType: ref?.sourceType ?? null,
      referralContactFname: ref?.contactFname ?? null,
      referralContactMname: ref?.contactMname ?? null,
      referralContactLname: ref?.contactLname ?? null,
      referralBusinessName: ref?.businessName ?? null,
      referralBusinessAddress: ref?.businessAddress ?? null,
      referralDoctorName: ref?.doctorName ?? null,
      referralSlnId: ref?.slnId ?? null,
    };
  }

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateRequisitionDto,
    actorId?: string,
  ) {
    // Destination branch: EZHT lets the user pick it; default to the active
    // branch. Always validate a client-supplied id against the caller's tenant.
    let destinationBranchId = branchId;
    if (dto.toBranchId) {
      await this.branchClient.findById(dto.toBranchId);
      destinationBranchId = dto.toBranchId;
    }
    if (!destinationBranchId) throw new RequisitionBranchRequiredException();

    // Validate a client-supplied source branch belongs to the caller's tenant.
    if (dto.fromBranchId) {
      await this.branchClient.findById(dto.fromBranchId);
    }
    // Batch-level lines must know the source branch up front (EZHT lists the source
    // warehouse's batches), so a batch cannot be resolved/reserved without it.
    if (dto.items.some((i) => i.batchId) && !dto.fromBranchId) {
      throw new RequisitionSourceBranchRequiredException();
    }

    const { lines, totals } = await this.buildRequisitionLines(tenantId, dto);
    const [fromDepartmentName, toDepartmentName] = await Promise.all([
      this.departmentName(dto.fromDepartmentId),
      this.departmentName(dto.toDepartmentId),
    ]);

    const reference =
      dto.reference ??
      (await this.numbering.next(tenantId, 'requisition', destinationBranchId));

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.create({
        data: {
          tenantId,
          branchId: destinationBranchId,
          fromBranchId: dto.fromBranchId ?? null,
          fromDepartmentId: dto.fromDepartmentId ?? null,
          fromDepartmentName: fromDepartmentName ?? null,
          toDepartmentId: dto.toDepartmentId ?? null,
          toDepartmentName: toDepartmentName ?? null,
          reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          status: dto.status ?? 'PENDING',
          note: dto.note,
          createdBy: actorId,
          ...this.headerData(dto, totals),
          items: { create: lines },
          statusHistory: {
            create: {
              tenantId,
              status: dto.status ?? 'PENDING',
              comment: 'Requisition created',
              createdBy: actorId,
            },
          },
        },
        include: { items: true, statusHistory: true },
      }),
    );
  }

  /** Edit a PENDING requisition: recompute totals and replace line items. */
  async update(
    id: string,
    tenantId: string,
    dto: CreateRequisitionDto,
    actorId?: string,
  ) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'PENDING') {
      throw new InvalidRequisitionStateException(req.status, 'edit');
    }
    if (dto.fromBranchId) {
      await this.branchClient.findById(dto.fromBranchId);
    }
    if (dto.items.some((i) => i.batchId) && !dto.fromBranchId) {
      throw new RequisitionSourceBranchRequiredException();
    }

    const { lines, totals } = await this.buildRequisitionLines(tenantId, dto);
    const [fromDepartmentName, toDepartmentName] = await Promise.all([
      this.departmentName(dto.fromDepartmentId),
      this.departmentName(dto.toDepartmentId),
    ]);

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryRequisitionItem.deleteMany({
        where: { requisitionId: id },
      });
      return tx.inventoryRequisition.update({
        where: { id },
        data: {
          fromBranchId: dto.fromBranchId ?? null,
          fromDepartmentId: dto.fromDepartmentId ?? null,
          fromDepartmentName: fromDepartmentName ?? null,
          toDepartmentId: dto.toDepartmentId ?? null,
          toDepartmentName: toDepartmentName ?? null,
          reference: dto.reference ?? req.reference,
          date: dto.date ? new Date(dto.date) : req.date,
          status: dto.status ?? req.status,
          note: dto.note,
          updatedBy: actorId,
          ...this.headerData(dto, totals),
          items: { create: lines },
        },
        include: { items: true, statusHistory: true },
      });
    });
  }

  /** Approve a PENDING requisition (optionally set the source branch). */
  async approve(
    id: string,
    tenantId: string,
    dto: ApproveRequisitionDto,
    actorId?: string,
  ) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'PENDING') {
      throw new InvalidRequisitionStateException(req.status, 'approve');
    }
    if (dto.fromBranchId) {
      await this.branchClient.findById(dto.fromBranchId);
    }
    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: actorId,
          fromBranchId: dto.fromBranchId ?? req.fromBranchId,
          statusHistory: {
            create: {
              tenantId,
              status: 'APPROVED',
              comment: dto.comment,
              createdBy: actorId,
            },
          },
        },
        include: { items: true, statusHistory: true },
      }),
    );
  }

  /** Reject a PENDING requisition with an optional reason. */
  async reject(
    id: string,
    tenantId: string,
    dto: RejectRequisitionDto,
    actorId?: string,
  ) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'PENDING') {
      throw new InvalidRequisitionStateException(req.status, 'reject');
    }
    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedBy: actorId,
          statusHistory: {
            create: {
              tenantId,
              status: 'REJECTED',
              comment: dto.comment,
              createdBy: actorId,
            },
          },
        },
        include: { items: true, statusHistory: true },
      }),
    );
  }

  /** Mark an APPROVED requisition as RECEIVED (goods delivered). */
  async receive(id: string, tenantId: string, actorId?: string) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'APPROVED') {
      throw new InvalidRequisitionStateException(req.status, 'receive');
    }
    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          statusHistory: {
            create: {
              tenantId,
              status: 'RECEIVED',
              comment: 'Goods received',
              createdBy: actorId,
            },
          },
        },
        include: { items: true, statusHistory: true },
      }),
    );
  }

  /**
   * Convert an APPROVED requisition into a stock transfer (source → destination).
   * The transfer is created PENDING; stock moves via the transfer's own
   * send/receive. Idempotent-guarded against double conversion.
   */
  async convertToTransfer(
    id: string,
    tenantId: string,
    dto: ConvertToTransferDto,
    actorId?: string,
  ) {
    const req = await this.findById(id, tenantId);
    if (req.convertedToTransferId) {
      throw new RequisitionAlreadyConvertedException(
        id,
        req.convertedToTransferId,
      );
    }
    if (req.status !== 'APPROVED') {
      throw new InvalidRequisitionStateException(req.status, 'convert');
    }
    if (!req.fromBranchId) throw new RequisitionSourceBranchRequiredException();

    const transfer = await this.transferService.create(
      tenantId,
      {
        fromBranchId: req.fromBranchId,
        toBranchId: req.branchId,
        reference: dto.reference,
        date: dto.date,
        note: dto.note ?? `From requisition ${req.reference}`,
        // Carry the requisition line's pricing AND chosen batch through to the
        // transfer (EZHT prefills the transfer form from the requisition), rather
        // than re-pricing/re-picking from the product master. TransferService.
        // buildLines re-resolves the batch from the source branch to re-snapshot it.
        items: req.items.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          rate: Number(l.netUnitPrice),
          taxRate: Number(l.taxRate),
          batchId: l.batchId ?? undefined,
          batchNo: l.batchNo ?? undefined,
          productSerial: l.serialNo ?? undefined,
          expiryDate: l.expiryDate ? l.expiryDate.toISOString() : undefined,
        })),
      },
      actorId,
    );

    const updated = await this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.update({
        where: { id },
        data: {
          status: 'TRANSFERRED',
          convertedToTransferId: transfer.id,
          statusHistory: {
            create: {
              tenantId,
              status: 'TRANSFERRED',
              comment: `Converted to transfer ${transfer.reference}`,
              createdBy: actorId,
            },
          },
        },
        include: { items: true, statusHistory: true },
      }),
    );
    return { requisition: updated, transfer };
  }

  async findAll(
    tenantId: string,
    query: RequisitionQueryDto,
    activeBranchId?: string | null,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryRequisitionWhereInput = {
      tenantId,
      deletedAt: null,
    };
    // Incoming (received) vs outgoing split, scoped to the active branch.
    if (activeBranchId) {
      if (query.received === 'true') {
        where.fromBranchId = activeBranchId;
      } else {
        where.branchId = activeBranchId;
      }
    }
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryRequisition.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryRequisition.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const req = await this.prisma.inventoryRequisition.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!req) throw new RequisitionNotFoundException(id);
    return req;
  }

  /**
   * Soft-delete a requisition. Blocked once it has been converted into a transfer
   * (the transfer owns the stock movement) or once it is past the request stage —
   * only PENDING or REJECTED requisitions may be deleted (EZHT parity).
   */
  async remove(id: string, tenantId: string) {
    const req = await this.findById(id, tenantId);
    if (req.convertedToTransferId) {
      throw new RequisitionAlreadyConvertedException(
        id,
        req.convertedToTransferId,
      );
    }
    if (req.status !== 'PENDING' && req.status !== 'REJECTED') {
      throw new InvalidRequisitionStateException(req.status, 'delete');
    }
    return this.prisma.inventoryRequisition.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
