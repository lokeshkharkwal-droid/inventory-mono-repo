import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  MasterSupplierQueryDto,
  CreateMasterSupplierDto,
  UpdateMasterSupplierDto,
} from './dto/master-supplier.dto';

/** 404 — a master supplier was not found (or soft-deleted). */
class MasterSupplierNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MASTER_SUPPLIER_NOT_FOUND',
      'Supplier not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * SiteAdmin-managed canonical supplier directory for the global catalogue.
 * Platform-level (no tenant scope, no RLS) — bare Prisma calls.
 */
@Injectable()
export class MasterSupplierService {
  constructor(private readonly prisma: PrismaService) {}

  private page(query: MasterSupplierQueryDto) {
    return { page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  private searchWhere(
    search?: string,
  ): Prisma.InventoryMasterSupplierWhereInput {
    const where: Prisma.InventoryMasterSupplierWhereInput = { deletedAt: null };
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    return where;
  }

  /**
   * List suppliers (paginated, searchable by name/company).
   * @param query page/limit/search filters
   * @returns a {@link PaginatedResult} of active suppliers
   */
  async list(query: MasterSupplierQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where = this.searchWhere(query.search);
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterSupplier.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterSupplier.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  /**
   * Lightweight supplier options for the master-product supplier picker.
   * @param query page/limit/search filters
   * @returns a {@link PaginatedResult} of `{ id, name, company }`
   */
  async options(
    query: MasterSupplierQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where = this.searchWhere(query.search);
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterSupplier.findMany({
            where,
            orderBy: { name: 'asc' },
            select: { id: true, name: true, company: true },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterSupplier.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  /**
   * Fetch a single active supplier by id.
   * @param id supplier id
   * @returns the supplier row
   * @throws MasterSupplierNotFoundException if missing/soft-deleted
   */
  async findOne(id: string) {
    const row = await this.prisma.inventoryMasterSupplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new MasterSupplierNotFoundException(id);
    return row;
  }

  /**
   * Create a supplier.
   * @param dto create payload (name required)
   * @param createdBy SiteAdmin id of the actor
   * @returns the created supplier
   */
  async create(dto: CreateMasterSupplierDto, createdBy?: string) {
    return this.prisma.inventoryMasterSupplier.create({
      data: {
        name: dto.name,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        vatNo: dto.vatNo,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  /**
   * Update a supplier.
   * @param id supplier id
   * @param dto partial update payload
   * @returns the updated supplier
   * @throws MasterSupplierNotFoundException if missing/soft-deleted
   */
  async update(id: string, dto: UpdateMasterSupplierDto) {
    await this.ensure(id);
    return this.prisma.inventoryMasterSupplier.update({
      where: { id },
      data: {
        name: dto.name,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        vatNo: dto.vatNo,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Soft-delete a supplier (sets `deletedAt`).
   * @param id supplier id
   * @returns the id + deletedAt stamp
   * @throws MasterSupplierNotFoundException if missing/soft-deleted
   */
  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.inventoryMasterSupplier.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensure(id: string) {
    const row = await this.prisma.inventoryMasterSupplier.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new MasterSupplierNotFoundException(id);
  }
}
