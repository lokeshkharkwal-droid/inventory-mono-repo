import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CreateBrandDto, UpdateBrandDto, BrandQueryDto } from './dto/brand.dto';
import {
  BrandCodeConflictException,
  BrandNotFoundException,
} from './exceptions/brand.exceptions';

const BRAND_SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryBrandSelect;

/** Brands / manufacturers — tenant-scoped, soft-delete aware. */
@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBrandDto) {
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    return this.prisma.inventoryBrand.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
      },
      select: BRAND_SELECT,
    });
  }

  async findAll(
    tenantId: string,
    query: BrandQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBrandWhereInput = {
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
      const rows = await tx.inventoryBrand.findMany({
        where,
        select: BRAND_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryBrand.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const brand = await this.prisma.inventoryBrand.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: BRAND_SELECT,
    });
    if (!brand) throw new BrandNotFoundException(id);
    return brand;
  }

  async update(id: string, tenantId: string, dto: UpdateBrandDto) {
    await this.findById(id, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    return this.prisma.inventoryBrand.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
      },
      select: BRAND_SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryBrand.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: BRAND_SELECT,
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryBrand.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BrandCodeConflictException(code);
  }
}
