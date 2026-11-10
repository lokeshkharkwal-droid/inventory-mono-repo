import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { ProductService } from '../product/product.service';
import { NumberingService } from '../settings/numbering.service';
import {
  ApproveRequisitionDto,
  CreateRequisitionDto,
  RequisitionQueryDto,
} from './dto/requisition.dto';
import {
  InvalidRequisitionStateException,
  RequisitionBranchRequiredException,
  RequisitionNotFoundException,
} from './exceptions/requisition.exceptions';

const D = (v: number | string) => new Prisma.Decimal(v);

/**
 * Internal requisitions — a request document workflow
 * (PENDING → APPROVED/REJECTED → RECEIVED). Fulfilment of approved requisitions
 * is done via a transfer; the requisition itself does not move stock.
 */
@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly numbering: NumberingService,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateRequisitionDto,
    actorId?: string,
  ) {
    if (!branchId) throw new RequisitionBranchRequiredException();

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: D(item.quantity),
        };
      }),
    );

    const reference =
      dto.reference ?? (await this.numbering.next(tenantId, 'requisition'));

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryRequisition.create({
        data: {
          tenantId,
          branchId,
          fromBranchId: dto.fromBranchId,
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
    return this.prisma.inventoryRequisition.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: actorId,
        fromBranchId: dto.fromBranchId ?? req.fromBranchId,
      },
      include: { items: true },
    });
  }

  /** Reject a PENDING requisition. */
  async reject(id: string, tenantId: string, actorId?: string) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'PENDING') {
      throw new InvalidRequisitionStateException(req.status, 'reject');
    }
    return this.prisma.inventoryRequisition.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: actorId },
      include: { items: true },
    });
  }

  /** Mark an APPROVED requisition as RECEIVED (goods delivered). */
  async receive(id: string, tenantId: string) {
    const req = await this.findById(id, tenantId);
    if (req.status !== 'APPROVED') {
      throw new InvalidRequisitionStateException(req.status, 'receive');
    }
    return this.prisma.inventoryRequisition.update({
      where: { id },
      data: { status: 'RECEIVED' },
      include: { items: true },
    });
  }

  async findAll(
    tenantId: string,
    query: RequisitionQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryRequisitionWhereInput = {
      tenantId,
      deletedAt: null,
    };
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
      include: { items: true },
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
