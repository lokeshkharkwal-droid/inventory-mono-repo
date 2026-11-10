import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  ImportSuppliersDto,
  CreateSupplierPaymentDto,
} from './dto/supplier.dto';
import { SupplierNotFoundException } from './exceptions/supplier.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';

/** Suppliers / vendors — tenant-scoped, soft-delete aware. */
@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.inventorySupplier.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        openingBalance: dto.openingBalance ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Bulk import suppliers (preview or commit), reusing {@link create}. */
  async import(
    tenantId: string,
    dto: ImportSuppliersDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateSupplierDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code ?? row.name,
      validate: (row) => {
        if (!row.name) throw new Error('Missing required field (name)');
      },
      create: (row) => this.create(tenantId, row),
    });
  }

  async findAll(
    tenantId: string,
    query: SupplierQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventorySupplierWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventorySupplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventorySupplier.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const supplier = await this.prisma.inventorySupplier.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!supplier) throw new SupplierNotFoundException(id);
    return supplier;
  }

  async update(id: string, tenantId: string, dto: UpdateSupplierDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventorySupplier.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        openingBalance: dto.openingBalance,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventorySupplier.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Supplier-level payments ────────────────────────────────────────────────────
  async addPayment(
    supplierId: string,
    tenantId: string,
    dto: CreateSupplierPaymentDto,
    actorId?: string,
  ) {
    await this.findById(supplierId, tenantId);
    return this.prisma.inventorySupplierPayment.create({
      data: {
        tenantId,
        supplierId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method ?? 'CASH',
        reference: dto.reference,
        note: dto.note,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actorId,
      },
    });
  }

  async listPayments(supplierId: string, tenantId: string) {
    await this.findById(supplierId, tenantId);
    const payments = await this.prisma.inventorySupplierPayment.findMany({
      where: { supplierId, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    const total = payments.reduce(
      (s, p) => s.add(p.amount),
      new Prisma.Decimal(0),
    );
    return { payments, total };
  }
}
