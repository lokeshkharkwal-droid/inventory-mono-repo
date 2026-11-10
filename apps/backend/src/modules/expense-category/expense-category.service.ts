import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  ExpenseCategoryQueryDto,
} from './dto/expense-category.dto';

/** 404 — expense category not found in this tenant. */
export class ExpenseCategoryNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'EXPENSE_CATEGORY_NOT_FOUND',
      'Expense category not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Expense categories — tenant-scoped, soft-delete aware. */
@Injectable()
export class ExpenseCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.inventoryExpenseCategory.create({
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
    query: ExpenseCategoryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryExpenseCategoryWhereInput = {
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
      const rows = await tx.inventoryExpenseCategory.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryExpenseCategory.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryExpenseCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new ExpenseCategoryNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateExpenseCategoryDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryExpenseCategory.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isActive: dto.isActive },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryExpenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
