import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxRateQueryDto,
} from './dto/tax-rate.dto';
import {
  TaxRateCodeConflictException,
  TaxRateNotFoundException,
} from './exceptions/tax-rate.exceptions';

const TAX_RATE_SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  rate: true,
  type: true,
  hsnCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryTaxRateSelect;

/** Tax rates (with HSN/SAC) — tenant-scoped, soft-delete aware. */
@Injectable()
export class TaxRateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTaxRateDto) {
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    return this.prisma.inventoryTaxRate.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        type: dto.type ?? 'percentage',
        hsnCode: dto.hsnCode,
        isActive: dto.isActive ?? true,
      },
      select: TAX_RATE_SELECT,
    });
  }

  async findAll(
    tenantId: string,
    query: TaxRateQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryTaxRateWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { hsnCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryTaxRate.findMany({
        where,
        select: TAX_RATE_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryTaxRate.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const taxRate = await this.prisma.inventoryTaxRate.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: TAX_RATE_SELECT,
    });
    if (!taxRate) throw new TaxRateNotFoundException(id);
    return taxRate;
  }

  async update(id: string, tenantId: string, dto: UpdateTaxRateDto) {
    await this.findById(id, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    return this.prisma.inventoryTaxRate.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        type: dto.type,
        hsnCode: dto.hsnCode,
        isActive: dto.isActive,
      },
      select: TAX_RATE_SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryTaxRate.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: TAX_RATE_SELECT,
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryTaxRate.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new TaxRateCodeConflictException(code);
  }
}
