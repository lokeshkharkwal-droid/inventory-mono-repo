import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  MasterProformaQueryDto,
  CreateMasterProformaDto,
  UpdateMasterProformaDto,
  MasterProformaItemDto,
} from './dto/master-proforma.dto';

/** 404 — a proforma was not found (or soft-deleted). */
class MasterProformaNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MASTER_PROFORMA_NOT_FOUND',
      'Proforma not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * SiteAdmin-managed master proformas (reusable, platform-level line-item
 * templates). No tenant scope / no RLS — bare Prisma calls, soft-delete.
 */
@Injectable()
export class MasterProformaService {
  constructor(private readonly prisma: PrismaService) {}

  private page(query: MasterProformaQueryDto) {
    return { page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  private toItemData(items?: MasterProformaItemDto[]) {
    return (items ?? []).map((i) => ({
      masterProductId: i.masterProductId,
      labTestId: i.labTestId,
      quantity: i.quantity,
    }));
  }

  /**
   * List proformas (paginated, searchable by name) with a line-item count.
   * @param query page / limit / search filters.
   * @returns a {@link PaginatedResult} of proformas including `_count.items`.
   */
  async listProformas(
    query: MasterProformaQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterProformaWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterProforma.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { items: true } } },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterProforma.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  /**
   * Fetch a single proforma including its line items.
   * @param id proforma id.
   * @returns the proforma with its `items`.
   * @throws {@link MasterProformaNotFoundException} when absent / soft-deleted.
   */
  async getProforma(id: string) {
    const row = await this.prisma.inventoryMasterProforma.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!row) throw new MasterProformaNotFoundException(id);
    return row;
  }

  /**
   * Create a proforma plus its nested line items.
   * @param dto name / date / status / notes + optional `items[]`.
   * @param createdBy SiteAdmin id of the actor.
   * @returns the created proforma with its `items`.
   */
  async createProforma(dto: CreateMasterProformaDto, createdBy?: string) {
    return this.prisma.inventoryMasterProforma.create({
      data: {
        name: dto.name,
        date: dto.date ? new Date(dto.date) : new Date(),
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
        createdBy,
        items: { create: this.toItemData(dto.items) },
      },
      include: { items: true },
    });
  }

  /**
   * Update a proforma. When `items` is supplied the whole line-item set is
   * replaced atomically (delete-all + re-create) inside a transaction.
   * @param id proforma id.
   * @param dto fields to update (and optionally a replacement `items[]`).
   * @returns the updated proforma with its `items`.
   * @throws {@link MasterProformaNotFoundException} when absent / soft-deleted.
   */
  async updateProforma(id: string, dto: UpdateMasterProformaDto) {
    await this.ensureProforma(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryMasterProforma.update({
        where: { id },
        data: {
          name: dto.name,
          date: dto.date ? new Date(dto.date) : undefined,
          status: dto.status,
          notes: dto.notes,
        },
      });
      if (dto.items !== undefined) {
        await tx.inventoryMasterProformaItem.deleteMany({
          where: { proformaId: id },
        });
        if (dto.items.length) {
          await tx.inventoryMasterProformaItem.createMany({
            data: this.toItemData(dto.items).map((i) => ({
              ...i,
              proformaId: id,
            })),
          });
        }
      }
      return tx.inventoryMasterProforma.findFirst({
        where: { id },
        include: { items: true },
      });
    });
  }

  /**
   * Soft-delete a proforma (sets `deletedAt`).
   * @param id proforma id.
   * @returns `{ id, deletedAt }`.
   * @throws {@link MasterProformaNotFoundException} when absent / soft-deleted.
   */
  async removeProforma(id: string) {
    await this.ensureProforma(id);
    return this.prisma.inventoryMasterProforma.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureProforma(id: string) {
    const row = await this.prisma.inventoryMasterProforma.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new MasterProformaNotFoundException(id);
  }
}
