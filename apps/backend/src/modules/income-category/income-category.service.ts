import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateIncomeCategoryDto,
  UpdateIncomeCategoryDto,
  IncomeCategoryQueryDto,
} from './dto/income-category.dto';

/** 404 — income category not found in this tenant. */
export class IncomeCategoryNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'INCOME_CATEGORY_NOT_FOUND',
      'Income category not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Income categories — tenant-scoped, soft-delete aware. */
@Injectable()
export class IncomeCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateIncomeCategoryDto) {
    return this.prisma.inventoryIncomeCategory.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: IncomeCategoryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryIncomeCategoryWhereInput = {
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
      const rows = await tx.inventoryIncomeCategory.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryIncomeCategory.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryIncomeCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new IncomeCategoryNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateIncomeCategoryDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIncomeCategory.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isActive: dto.isActive },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIncomeCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
