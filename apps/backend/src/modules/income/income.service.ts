import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import {
  CreateIncomeDto,
  UpdateIncomeDto,
  IncomeQueryDto,
} from './dto/income.dto';

/** 404 — income not found. */
export class IncomeNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('INCOME_NOT_FOUND', 'Income not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** Non-sale incomes — tenant-scoped, soft-delete aware. */
@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateIncomeDto,
    actorId?: string,
  ) {
    return this.prisma.inventoryIncome.create({
      data: {
        tenantId,
        branchId,
        categoryId: dto.categoryId,
        reference: dto.reference ?? generateReference('INC'),
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
        createdBy: actorId,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: IncomeQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryIncomeWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search)
      where.reference = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryIncome.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryIncome.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryIncome.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new IncomeNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateIncomeDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIncome.update({
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
    return this.prisma.inventoryIncome.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
