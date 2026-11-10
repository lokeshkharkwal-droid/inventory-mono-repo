import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
} from './dto/expense.dto';

/** 404 — expense not found. */
export class ExpenseNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'EXPENSE_NOT_FOUND',
      'Expense not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Operating expenses — tenant-scoped, soft-delete aware. */
@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateExpenseDto,
    actorId?: string,
  ) {
    return this.prisma.inventoryExpense.create({
      data: {
        tenantId,
        branchId,
        categoryId: dto.categoryId,
        reference: dto.reference ?? generateReference('EXP'),
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
        createdBy: actorId,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: ExpenseQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryExpenseWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryExpense.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryExpense.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new ExpenseNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateExpenseDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryExpense.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        reference: dto.reference,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryExpense.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
