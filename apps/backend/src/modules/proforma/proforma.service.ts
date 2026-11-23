import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { resolveUserName } from '../../common/utils/party-detail.util';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import {
  CreateProformaDto,
  CreateProformaRelationDto,
  ProformaQueryDto,
  ProformaRelationQueryDto,
  ProformaRelationType,
  UpdateProformaStatusDto,
} from './dto/proforma.dto';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** Relation kinds a proforma mapping can currently be created for. The rest are
 * surfaced (disabled) in the UI but rejected server-side until their kalnostics
 * feature exists — never persist a half-working mapping (requirement #1). */
const ENABLED_RELATION_TYPES: ReadonlySet<ProformaRelationType> = new Set([
  'lab_test',
  'branch',
]);

/** 404 — proforma not found (or soft-deleted) in this tenant. */
export class ProformaNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PROFORMA_NOT_FOUND',
      'Proforma not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 404 — proforma mapping row not found in this tenant. */
export class ProformaRelationNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PROFORMA_RELATION_NOT_FOUND',
      'Proforma mapping not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 422 — tried to map a proforma to an entity kind that isn't wired yet. */
export class ProformaRelationTypeNotEnabledException extends KaltrosException {
  constructor(entityType: string) {
    super(
      'PROFORMA_RELATION_TYPE_NOT_ENABLED',
      `Mapping a proforma to "${entityType}" is not available yet`,
      { entityType },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Proforma invoices — pre-invoice documents (no stock movement). Product lines
 * plus optional lab/radiology lines (stored as JSON). Totals include both.
 */
@Injectable()
export class ProformaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly usersClient: KalnosticsUsersClient,
  ) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateProformaDto,
    actorId?: string,
  ) {
    if (dto.customerId) {
      await this.customerService.findById(dto.customerId, tenantId);
    }

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const unitPrice = D(item.unitPrice);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(unitPrice).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          quantityMethod: item.quantityMethod ?? 1,
          unitPrice,
          taxRate,
          taxAmount,
          discount,
          subtotal: lineSubtotal,
        };
      }),
    );

    const labTotal = (dto.labTests ?? []).reduce(
      (s, t) => s.add(D(t.price)),
      D(0),
    );
    const subtotal = lines
      .reduce((s, l) => s.add(l.subtotal), D(0))
      .add(labTotal);
    const orderTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const shipping = D(dto.shipping ?? 0);
    const grandTotal = subtotal.add(orderTax).add(shipping).sub(orderDiscount);

    return this.prisma.withTenant(tenantId, async (tx) =>
      tx.inventoryProforma.create({
        data: {
          tenantId,
          branchId,
          customerId: dto.customerId,
          name: dto.name,
          reference: dto.reference ?? generateReference('PF'),
          date: dto.date ? new Date(dto.date) : new Date(),
          status: dto.status ?? 'ACTIVE',
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
          labTests: dto.labTests
            ? (dto.labTests as unknown as Prisma.InputJsonValue)
            : undefined,
          note: dto.note,
          createdBy: actorId,
          items: { create: lines },
        },
        include: { items: true },
      }),
    );
  }

  /**
   * Full edit of a proforma (EZHT `proformas/edit`): replaces the header fields
   * and the entire product-line set, recomputing totals exactly like
   * {@link create}. Mappings (lab test / branch relations) are preserved.
   */
  async update(
    id: string,
    tenantId: string,
    dto: CreateProformaDto,
    _actorId?: string,
  ) {
    await this.findById(id, tenantId);
    if (dto.customerId) {
      await this.customerService.findById(dto.customerId, tenantId);
    }

    const lines = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId,
          tenantId,
        );
        const qty = D(item.quantity);
        const unitPrice = D(item.unitPrice);
        const discount = D(item.discount ?? 0);
        const taxRate = D(item.taxRate ?? 0);
        const lineSubtotal = qty.mul(unitPrice).sub(discount);
        const taxAmount = lineSubtotal.mul(taxRate).div(100);
        return {
          tenantId,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: qty,
          quantityMethod: item.quantityMethod ?? 1,
          unitPrice,
          taxRate,
          taxAmount,
          discount,
          subtotal: lineSubtotal,
        };
      }),
    );

    const labTotal = (dto.labTests ?? []).reduce(
      (s, t) => s.add(D(t.price)),
      D(0),
    );
    const subtotal = lines
      .reduce((s, l) => s.add(l.subtotal), D(0))
      .add(labTotal);
    const orderTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
    const orderDiscount = D(dto.orderDiscount ?? 0);
    const shipping = D(dto.shipping ?? 0);
    const grandTotal = subtotal.add(orderTax).add(shipping).sub(orderDiscount);

    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.inventoryProformaItem.deleteMany({ where: { proformaId: id } });
      return tx.inventoryProforma.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? null,
          name: dto.name,
          reference: dto.reference ?? undefined,
          date: dto.date ? new Date(dto.date) : undefined,
          status: dto.status ?? undefined,
          subtotal,
          orderTax,
          orderDiscount,
          shipping,
          grandTotal,
          labTests: dto.labTests
            ? (dto.labTests as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          note: dto.note ?? null,
          items: { create: lines },
        },
        include: { items: true },
      });
    });
  }

  async findAll(
    tenantId: string,
    query: ProformaQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryProformaWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search)
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo)
      where.date = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lt: new Date(query.dateTo) } : {}),
      };

    const [rows, total] = await this.prisma.$transaction(async (tx) => {
      const list = await tx.inventoryProforma.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // Branch mappings for the list's "Branch Relations" column.
        include: {
          relations: {
            where: { entityType: 'branch', deletedAt: null },
            select: { id: true, label: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      const count = await tx.inventoryProforma.count({ where });
      return [list, count] as const;
    });

    // EZHT listing parity: show each proforma's assigned branches
    // (comma-separated), mirroring `ez_proforma_relation` entity_type='branch'.
    // Branch names come from the relation `label` stored on assignment. Batched
    // into one query (no N+1) and mapped back by proforma id.
    const ids = rows.map((r) => r.id);
    const branchMap = new Map<string, string[]>();
    if (ids.length) {
      const relations = await this.prisma.inventoryProformaRelation.findMany({
        where: {
          proformaId: { in: ids },
          tenantId,
          entityType: 'branch',
          deletedAt: null,
        },
        select: { proformaId: true, label: true, entityId: true },
        orderBy: { createdAt: 'asc' },
      });
      for (const rel of relations) {
        const names = branchMap.get(rel.proformaId) ?? [];
        names.push(rel.label ?? rel.entityId);
        branchMap.set(rel.proformaId, names);
      }
    }

    const data = rows.map((r) => ({
      ...r,
      branchNames: branchMap.get(r.id) ?? [],
    }));
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const proforma = await this.prisma.inventoryProforma.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!proforma) throw new ProformaNotFoundException(id);
    return proforma;
  }

  /**
   * Fetch one proforma enriched for the details modal (legacy
   * `proformas/modal_view`): the created-by staff name (resolved via the
   * kalnostics integration) and the customer's name. Kept separate from
   * {@link findById} — which the write paths reuse — so those stay fast; both
   * lookups are best-effort and degrade to `null`.
   */
  async getDetail(id: string, tenantId: string) {
    const proforma = await this.findById(id, tenantId);
    const [createdByName, customerName] = await Promise.all([
      resolveUserName(this.usersClient, proforma.createdBy),
      proforma.customerId
        ? this.customerService
            .findById(proforma.customerId, tenantId)
            .then((c) => c.name)
            .catch(() => null)
        : Promise.resolve(null),
    ]);
    return { ...proforma, createdByName, customerName };
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateProformaStatusDto,
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProforma.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProforma.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Proforma ↔ entity mappings (Lab Test / Branch, …) ────────────────────────

  /**
   * List a proforma's live mappings, optionally filtered by `type`
   * (`lab_test` | `branch` | …). Tenant-scoped; newest first.
   */
  async listRelations(
    id: string,
    tenantId: string,
    query: ProformaRelationQueryDto = {},
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProformaRelation.findMany({
      where: {
        proformaId: id,
        tenantId,
        deletedAt: null,
        ...(query.type ? { entityType: query.type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Map a proforma to an external entity (a kalnostics master lab test, a branch).
   * Idempotent: an existing live mapping for the same (type, entityId) is returned
   * as-is; a previously soft-deleted one is reactivated instead of duplicated
   * (mirrors the legacy EZHT reactivate-on-re-add behaviour).
   *
   * @throws ProformaRelationTypeNotEnabledException for kinds not wired yet
   *   (radiology / blood donation / blood request).
   */
  async addRelation(
    id: string,
    tenantId: string,
    branchId: string | null,
    dto: CreateProformaRelationDto,
    actorId?: string,
  ) {
    await this.findById(id, tenantId);
    if (!ENABLED_RELATION_TYPES.has(dto.entityType)) {
      throw new ProformaRelationTypeNotEnabledException(dto.entityType);
    }

    const existing = await this.prisma.inventoryProformaRelation.findFirst({
      where: {
        proformaId: id,
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && existing.deletedAt === null) return existing;
    if (existing) {
      return this.prisma.inventoryProformaRelation.update({
        where: { id: existing.id },
        data: { deletedAt: null, label: dto.label ?? existing.label },
      });
    }

    return this.prisma.inventoryProformaRelation.create({
      data: {
        tenantId,
        // A `branch` mapping stores the branch it targets; other kinds record the
        // caller's active branch purely as provenance.
        branchId: dto.entityType === 'branch' ? dto.entityId : branchId,
        proformaId: id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        label: dto.label,
        createdBy: actorId,
      },
    });
  }

  /** Soft-delete a proforma mapping (tenant-scoped). */
  async removeRelation(id: string, relationId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const relation = await this.prisma.inventoryProformaRelation.findFirst({
      where: { id: relationId, proformaId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!relation) throw new ProformaRelationNotFoundException(relationId);
    return this.prisma.inventoryProformaRelation.update({
      where: { id: relationId },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
