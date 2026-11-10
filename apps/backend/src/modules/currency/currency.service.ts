import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyQueryDto,
} from './dto/currency.dto';

/** 404 — currency not found in this tenant. */
export class CurrencyNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'CURRENCY_NOT_FOUND',
      'Currency not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Currencies — tenant-scoped, soft-delete aware. */
@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCurrencyDto) {
    return this.prisma.inventoryCurrency.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol,
        exchangeRate: dto.exchangeRate ?? 1,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: CurrencyQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryCurrencyWhereInput = {
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
      const rows = await tx.inventoryCurrency.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryCurrency.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryCurrency.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new CurrencyNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateCurrencyDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCurrency.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol,
        exchangeRate: dto.exchangeRate,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCurrency.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
