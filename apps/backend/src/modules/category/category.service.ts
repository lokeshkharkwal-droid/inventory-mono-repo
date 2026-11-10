import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryEntity } from './entities/category.entity';
import {
  CategoryCodeConflictException,
  CategoryNotFoundException,
} from './exceptions/category.exceptions';

/** Fields returned to clients (never expose the legacy provenance column). */
const CATEGORY_SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryCategorySelect;

/**
 * Inventory category service. All reads/writes are tenant-scoped and soft-delete
 * aware (CLAUDE.md §4.7); the tenant comes from the JWT, never the request body.
 */
@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a category in the tenant, enforcing code uniqueness (when a code is
   * given) among active rows.
   * @param tenantId from `@CurrentTenant()`
   * @param dto validated creation payload
   * @throws CategoryCodeConflictException if the code is already in use
   */
  async create(
    tenantId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    if (dto.code) {
      await this.assertCodeFree(tenantId, dto.code);
    }
    return this.prisma.inventoryCategory.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: CATEGORY_SELECT,
    });
  }

  /**
   * List categories for the tenant (paginated + searchable + status filter).
   * Returns `{ data, total, page, limit }` for the ResponseInterceptor to reshape.
   */
  async findAll(
    tenantId: string,
    query: CategoryQueryDto,
  ): Promise<PaginatedResult<CategoryEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryCategoryWhereInput = {
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
      const rows = await tx.inventoryCategory.findMany({
        where,
        select: CATEGORY_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      });
      const count = await tx.inventoryCategory.count({ where });
      return [rows, count] as const;
    });

    return { data, total, page, limit };
  }

  /**
   * Fetch one category scoped to its tenant.
   * @throws CategoryNotFoundException if missing or soft-deleted
   */
  async findById(id: string, tenantId: string): Promise<CategoryEntity> {
    const category = await this.prisma.inventoryCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: CATEGORY_SELECT,
    });
    if (!category) throw new CategoryNotFoundException(id);
    return category;
  }

  /**
   * Update a category. Verifies ownership first and re-checks code uniqueness.
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    await this.findById(id, tenantId);
    if (dto.code) {
      await this.assertCodeFree(tenantId, dto.code, id);
    }
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
      select: CATEGORY_SELECT,
    });
  }

  /** Soft-delete a category (sets `deletedAt`). */
  async remove(id: string, tenantId: string): Promise<CategoryEntity> {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: CATEGORY_SELECT,
    });
  }

  /** Throw if `code` is already used by another active category in the tenant. */
  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new CategoryCodeConflictException(code);
  }
}
