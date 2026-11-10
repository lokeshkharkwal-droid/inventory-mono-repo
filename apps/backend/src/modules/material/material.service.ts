import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryDto,
  CreateMaterialDamageDto,
  CreateMaterialRepairDto,
  ImportMaterialsDto,
} from './dto/material.dto';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — material not found (or soft-deleted) in this tenant. */
export class MaterialNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MATERIAL_NOT_FOUND',
      'Material not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Materials — consumables/equipment tracked simply per branch, with damage and
 * repair sub-records. A damage decrements the material's on-hand quantity.
 */
@Injectable()
export class MaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateMaterialDto,
  ) {
    return this.prisma.inventoryMaterial.create({
      data: {
        tenantId,
        branchId,
        name: dto.name,
        code: dto.code,
        category: dto.category,
        unit: dto.unit,
        quantity: dto.quantity ?? 0,
        cost: dto.cost ?? 0,
        note: dto.note,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Bulk import materials (preview or commit), reusing {@link create}. */
  async import(
    tenantId: string,
    branchId: string | null,
    dto: ImportMaterialsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateMaterialDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code ?? row.name,
      validate: (row) => {
        if (!row.name) throw new Error('Missing required field (name)');
      },
      create: (row) => this.create(tenantId, branchId, row),
    });
  }

  async findAll(
    tenantId: string,
    query: MaterialQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryMaterialWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryMaterial.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryMaterial.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const material = await this.prisma.inventoryMaterial.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        damages: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        repairs: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    });
    if (!material) throw new MaterialNotFoundException(id);
    return material;
  }

  async update(id: string, tenantId: string, dto: UpdateMaterialDto) {
    await this.ensureExists(id, tenantId);
    return this.prisma.inventoryMaterial.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        category: dto.category,
        unit: dto.unit,
        quantity: dto.quantity,
        cost: dto.cost,
        note: dto.note,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.ensureExists(id, tenantId);
    return this.prisma.inventoryMaterial.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  /** Record a damage and decrement the material's on-hand quantity atomically. */
  async addDamage(
    id: string,
    tenantId: string,
    dto: CreateMaterialDamageDto,
    actorId?: string,
  ) {
    const material = await this.ensureExists(id, tenantId);
    const qty = D(dto.quantity);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const damage = await tx.inventoryMaterialDamage.create({
        data: {
          tenantId,
          materialId: id,
          quantity: qty,
          reason: dto.reason,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          createdBy: actorId,
        },
      });
      const newQty = D(material.quantity).sub(qty);
      await tx.inventoryMaterial.update({
        where: { id },
        data: { quantity: newQty.lt(0) ? new Prisma.Decimal(0) : newQty },
      });
      return damage;
    });
  }

  /** Record a repair for the material. */
  async addRepair(
    id: string,
    tenantId: string,
    dto: CreateMaterialRepairDto,
    actorId?: string,
  ) {
    await this.ensureExists(id, tenantId);
    return this.prisma.inventoryMaterialRepair.create({
      data: {
        tenantId,
        materialId: id,
        cost: dto.cost ?? 0,
        status: dto.status ?? 'PENDING',
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
        createdBy: actorId,
      },
    });
  }

  /** Verify a material exists in the tenant; returns it. */
  private async ensureExists(id: string, tenantId: string) {
    const material = await this.prisma.inventoryMaterial.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!material) throw new MaterialNotFoundException(id);
    return material;
  }
}
