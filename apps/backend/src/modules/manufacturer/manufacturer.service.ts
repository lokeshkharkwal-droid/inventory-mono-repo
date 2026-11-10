import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import {
  CreateManufacturerDto,
  UpdateManufacturerDto,
  ManufacturerQueryDto,
  ImportManufacturersDto,
} from './dto/manufacturer.dto';
import {
  ManufacturerCodeConflictException,
  ManufacturerNotFoundException,
} from './exceptions/manufacturer.exceptions';

const SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  companyName: true,
  phone: true,
  email: true,
  website: true,
  address: true,
  imageUrl: true,
  note: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryManufacturerSelect;

/** Manufacturers — maker companies/parties, tenant-scoped, soft-delete aware. */
@Injectable()
export class ManufacturerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateManufacturerDto) {
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    return this.prisma.inventoryManufacturer.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        imageUrl: dto.imageUrl,
        note: dto.note,
        isActive: dto.isActive ?? true,
      },
      select: SELECT,
    });
  }

  /** Bulk import manufacturers (preview or commit), reusing {@link create}. */
  async import(
    tenantId: string,
    dto: ImportManufacturersDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateManufacturerDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code ?? row.name,
      validate: (row) => {
        if (!row.name) throw new Error('Missing required field (name)');
      },
      create: (row) => this.create(tenantId, row),
    });
  }

  async findAll(
    tenantId: string,
    query: ManufacturerQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryManufacturerWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryManufacturer.findMany({
        where,
        select: SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryManufacturer.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryManufacturer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: SELECT,
    });
    if (!row) throw new ManufacturerNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateManufacturerDto) {
    await this.findById(id, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    return this.prisma.inventoryManufacturer.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        imageUrl: dto.imageUrl,
        note: dto.note,
        isActive: dto.isActive,
      },
      select: SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryManufacturer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryManufacturer.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ManufacturerCodeConflictException(code);
  }
}
