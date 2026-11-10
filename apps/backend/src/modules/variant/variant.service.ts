import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  CreateVariantDto,
  UpdateVariantDto,
  VariantQueryDto,
} from './dto/variant.dto';
import { VariantNotFoundException } from './exceptions/variant.exceptions';

const VARIANT_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  values: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryVariantSelect;

/** Variant/option templates — tenant-scoped, soft-delete aware. */
@Injectable()
export class VariantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateVariantDto) {
    return this.prisma.inventoryVariant.create({
      data: {
        tenantId,
        name: dto.name,
        values: dto.values,
        isActive: dto.isActive ?? true,
      },
      select: VARIANT_SELECT,
    });
  }

  async findAll(
    tenantId: string,
    query: VariantQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryVariantWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryVariant.findMany({
        where,
        select: VARIANT_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryVariant.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const variant = await this.prisma.inventoryVariant.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: VARIANT_SELECT,
    });
    if (!variant) throw new VariantNotFoundException(id);
    return variant;
  }

  async update(id: string, tenantId: string, dto: UpdateVariantDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryVariant.update({
      where: { id },
      data: { name: dto.name, values: dto.values, isActive: dto.isActive },
      select: VARIANT_SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryVariant.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: VARIANT_SELECT,
    });
  }
}
