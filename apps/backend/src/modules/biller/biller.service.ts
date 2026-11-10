import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerQueryDto,
} from './dto/biller.dto';

/** 404 — biller not found in this tenant. */
export class BillerNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('BILLER_NOT_FOUND', 'Biller not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** Billers — tenant-scoped, soft-delete aware. */
@Injectable()
export class BillerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBillerDto) {
    return this.prisma.inventoryBiller.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: BillerQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBillerWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryBiller.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryBiller.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryBiller.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new BillerNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateBillerDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryBiller.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryBiller.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
