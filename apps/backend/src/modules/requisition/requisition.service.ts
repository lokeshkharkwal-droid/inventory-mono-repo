import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from '../product/product.service';
import { NumberingService } from '../settings/numbering.service';
import { TransferService } from '../transfer/transfer.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsDepartmentClient } from '../../integration/clients/kalnostics-department.client';
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
  ) {}

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
        return { item, product };
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
      ({ item, product }, i) => {
        const c = totals.lines[i]!;
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          productType: product.type ?? null,
          optionId: item.optionId ?? null,
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
    };
  }

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateRequisitionDto,
    actorId?: string,
  ) {
    if (!branchId) throw new RequisitionBranchRequiredException();

    // Validate a client-supplied source branch belongs to the caller's tenant.
    if (dto.fromBranchId) {
      await this.branchClient.findById(dto.fromBranchId);
    }

    const { lines, totals } = await this.buildRequisitionLines(tenantId, dto);
    const [fromDepartmentName, toDepartmentName] = await Promise.all([
      this.departmentName(dto.fromDepartmentId),
      this.departmentName(dto.toDepartmentId),
    ]);

    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'requisition'));

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.create({
        data: {
          tenantId,
          branchId,
          fromBranchId: dto.fromBranchId ?? null,
          fromDepartmentId: dto.fromDepartmentId ?? null,
          fromDepartmentName: fromDepartmentName ?? null,
          toDepartmentId: dto.toDepartmentId ?? null,
          toDepartmentName: toDepartmentName ?? null,
          reference,
          date: dto.date ? new Date(dto.date) : new Date(),
          status: 'PENDING',
          note: dto.note,
          createdBy: actorId,
          ...this.headerData(dto, totals),
          items: { create: lines },
          statusHistory: {
            create: {
              tenantId,
              status: 'PENDING',
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
        items: req.items.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
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

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryRequisition.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
