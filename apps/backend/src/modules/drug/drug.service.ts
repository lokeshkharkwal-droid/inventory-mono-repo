import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CreateDrugDto, UpdateDrugDto, DrugQueryDto } from './dto/drug.dto';
import { DrugNotFoundException } from './exceptions/drug.exceptions';

const SELECT = {
  id: true,
  tenantId: true,
  name: true,
  dosage: true,
  sideEffect: true,
  indication: true,
  contraIndication: true,
  formulation: true,
  storageCondition: true,
  precaution: true,
  safety: true,
  therapeuticGroup: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryDrugSelect;

/**
 * Tenant drug master (EZHT `pharmacy_drug`) — the catalogue the product "Drugs"
 * modal autocomplete picks from. Tenant-scoped, soft-delete aware (rule #4.7).
 */
@Injectable()
export class DrugService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a master drug. */
  async create(tenantId: string, dto: CreateDrugDto) {
    return this.prisma.inventoryDrug.create({
      data: {
        tenantId,
        name: dto.name,
        dosage: dto.dosage,
        sideEffect: dto.sideEffect,
        indication: dto.indication,
        contraIndication: dto.contraIndication,
        formulation: dto.formulation,
        storageCondition: dto.storageCondition,
        precaution: dto.precaution,
        safety: dto.safety,
        therapeuticGroup: dto.therapeuticGroup,
        isActive: dto.isActive ?? true,
      },
      select: SELECT,
    });
  }

  /** Paginated, searchable list (search doubles as the autocomplete source). */
  async findAll(
    tenantId: string,
    query: DrugQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryDrugWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryDrug.findMany({
        where,
        select: SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryDrug.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  /** Fetch a single master drug (throws 404 if absent/soft-deleted). */
  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryDrug.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: SELECT,
    });
    if (!row) throw new DrugNotFoundException(id);
    return row;
  }

  /** Update a master drug. */
  async update(id: string, tenantId: string, dto: UpdateDrugDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryDrug.update({
      where: { id },
      data: {
        name: dto.name,
        dosage: dto.dosage,
        sideEffect: dto.sideEffect,
        indication: dto.indication,
        contraIndication: dto.contraIndication,
        formulation: dto.formulation,
        storageCondition: dto.storageCondition,
        precaution: dto.precaution,
        safety: dto.safety,
        therapeuticGroup: dto.therapeuticGroup,
        isActive: dto.isActive,
      },
      select: SELECT,
    });
  }

  /** Soft-delete a master drug. */
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryDrug.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
