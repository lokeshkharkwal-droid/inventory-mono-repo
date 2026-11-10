import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CreateUnitDto, UpdateUnitDto, UnitQueryDto } from './dto/unit.dto';
import {
  UnitCodeConflictException,
  UnitNotFoundException,
} from './exceptions/unit.exceptions';

const UNIT_SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  baseUnitId: true,
  operator: true,
  operationValue: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryUnitSelect;

/** Units of measure — tenant-scoped, soft-delete aware (CLAUDE.md §4.7). */
@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a unit. Validates code uniqueness and (if given) that the base unit
   * belongs to the same tenant.
   */
  async create(tenantId: string, dto: CreateUnitDto) {
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    if (dto.baseUnitId) await this.findById(dto.baseUnitId, tenantId);
    return this.prisma.inventoryUnit.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        baseUnitId: dto.baseUnitId,
        operator: dto.operator,
        operationValue: dto.operationValue,
        isActive: dto.isActive ?? true,
      },
      select: UNIT_SELECT,
    });
  }

  /** Paginated, searchable list scoped to the tenant. */
  async findAll(
    tenantId: string,
    query: UnitQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryUnitWhereInput = { tenantId, deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryUnit.findMany({
        where,
        select: UNIT_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryUnit.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  /** Fetch one unit scoped to its tenant. */
  async findById(id: string, tenantId: string) {
    const unit = await this.prisma.inventoryUnit.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: UNIT_SELECT,
    });
    if (!unit) throw new UnitNotFoundException(id);
    return unit;
  }

  /** Update a unit. */
  async update(id: string, tenantId: string, dto: UpdateUnitDto) {
    await this.findById(id, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    if (dto.baseUnitId) await this.findById(dto.baseUnitId, tenantId);
    return this.prisma.inventoryUnit.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        baseUnitId: dto.baseUnitId,
        operator: dto.operator,
        operationValue: dto.operationValue,
        isActive: dto.isActive,
      },
      select: UNIT_SELECT,
    });
  }

  /** Soft-delete a unit. */
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryUnit.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: UNIT_SELECT,
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryUnit.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new UnitCodeConflictException(code);
  }
}
