import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
  CustomerGroupQueryDto,
} from './dto/customer-group.dto';

/** 404 — customer group not found in this tenant. */
export class CustomerGroupNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'CUSTOMER_GROUP_NOT_FOUND',
      'Customer group not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Customer groups — tenant-scoped, soft-delete aware. */
@Injectable()
export class CustomerGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCustomerGroupDto) {
    return this.prisma.inventoryCustomerGroup.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        percentage: dto.percentage ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: CustomerGroupQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryCustomerGroupWhereInput = {
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
      const rows = await tx.inventoryCustomerGroup.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryCustomerGroup.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryCustomerGroup.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new CustomerGroupNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerGroupDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCustomerGroup.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        percentage: dto.percentage,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCustomerGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
