import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CategoryService } from '../category/category.service';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
  SubCategoryQueryDto,
} from './dto/sub-category.dto';
import {
  SubCategoryCodeConflictException,
  SubCategoryNotFoundException,
} from './exceptions/sub-category.exceptions';

const SUB_CATEGORY_SELECT = {
  id: true,
  tenantId: true,
  categoryId: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventorySubCategorySelect;

/**
 * Sub-categories — tenant-scoped, soft-delete aware. The parent category is
 * validated via the injected `CategoryService` (wired through the module's
 * imports, per CLAUDE.md rule #3 — no direct cross-module file import of logic).
 */
@Injectable()
export class SubCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  async create(tenantId: string, dto: CreateSubCategoryDto) {
    await this.categoryService.findById(dto.categoryId, tenantId); // 404 if not in tenant
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    return this.prisma.inventorySubCategory.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: SUB_CATEGORY_SELECT,
    });
  }

  async findAll(
    tenantId: string,
    query: SubCategoryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySubCategoryWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySubCategory.findMany({
        where,
        select: SUB_CATEGORY_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventorySubCategory.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const sub = await this.prisma.inventorySubCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: SUB_CATEGORY_SELECT,
    });
    if (!sub) throw new SubCategoryNotFoundException(id);
    return sub;
  }

  async update(id: string, tenantId: string, dto: UpdateSubCategoryDto) {
    await this.findById(id, tenantId);
    if (dto.categoryId)
      await this.categoryService.findById(dto.categoryId, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    return this.prisma.inventorySubCategory.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
      select: SUB_CATEGORY_SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventorySubCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: SUB_CATEGORY_SELECT,
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventorySubCategory.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new SubCategoryCodeConflictException(code);
  }
}
