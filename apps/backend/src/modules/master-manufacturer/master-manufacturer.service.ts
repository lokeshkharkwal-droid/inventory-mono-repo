import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  MasterManufacturerQueryDto,
  CreateMasterManufacturerDto,
  UpdateMasterManufacturerDto,
} from './dto/master-manufacturer.dto';

/** 404 — a master manufacturer was not found (or soft-deleted). */
class MasterManufacturerNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MASTER_MANUFACTURER_NOT_FOUND',
      'Manufacturer not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * SiteAdmin-managed canonical manufacturer directory for the global catalogue.
 * Platform-level (no tenant scope, no RLS) — bare Prisma calls.
 */
@Injectable()
export class MasterManufacturerService {
  constructor(private readonly prisma: PrismaService) {}

  private page(query: MasterManufacturerQueryDto) {
    return { page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  /**
   * List manufacturers (paginated, searchable by name/company).
   * @param query page/limit/search filters
   * @returns a {@link PaginatedResult} of active manufacturers
   */
  async list(
    query: MasterManufacturerQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterManufacturerWhereInput = {
      deletedAt: null,
    };
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
      ];
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterManufacturer.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterManufacturer.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  /**
   * Fetch a single active manufacturer by id.
   * @param id manufacturer id
   * @returns the manufacturer row
   * @throws MasterManufacturerNotFoundException if missing/soft-deleted
   */
  async findOne(id: string) {
    const row = await this.prisma.inventoryMasterManufacturer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new MasterManufacturerNotFoundException(id);
    return row;
  }

  /**
   * Create a manufacturer.
   * @param dto create payload (company + name required)
   * @param createdBy SiteAdmin id of the actor
   * @returns the created manufacturer
   */
  async create(dto: CreateMasterManufacturerDto, createdBy?: string) {
    return this.prisma.inventoryMasterManufacturer.create({
      data: {
        company: dto.company,
        name: dto.name,
        logoUrl: dto.logoUrl,
        vatNo: dto.vatNo,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        invoiceFooter: dto.invoiceFooter,
        cf1: dto.cf1,
        cf2: dto.cf2,
        cf3: dto.cf3,
        cf4: dto.cf4,
        cf5: dto.cf5,
        cf6: dto.cf6,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  /**
   * Update a manufacturer.
   * @param id manufacturer id
   * @param dto partial update payload
   * @returns the updated manufacturer
   * @throws MasterManufacturerNotFoundException if missing/soft-deleted
   */
  async update(id: string, dto: UpdateMasterManufacturerDto) {
    await this.ensure(id);
    return this.prisma.inventoryMasterManufacturer.update({
      where: { id },
      data: {
        company: dto.company,
        name: dto.name,
        logoUrl: dto.logoUrl,
        vatNo: dto.vatNo,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        invoiceFooter: dto.invoiceFooter,
        cf1: dto.cf1,
        cf2: dto.cf2,
        cf3: dto.cf3,
        cf4: dto.cf4,
        cf5: dto.cf5,
        cf6: dto.cf6,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Soft-delete a manufacturer (sets `deletedAt`).
   * @param id manufacturer id
   * @returns the id + deletedAt stamp
   * @throws MasterManufacturerNotFoundException if missing/soft-deleted
   */
  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.inventoryMasterManufacturer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensure(id: string) {
    const row = await this.prisma.inventoryMasterManufacturer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new MasterManufacturerNotFoundException(id);
  }
}
