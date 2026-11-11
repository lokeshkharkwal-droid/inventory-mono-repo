import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  ImportCustomersDto,
  CreateCustomerDepositDto,
} from './dto/customer.dto';
import {
  CustomerNotFoundException,
  SelfReferralException,
} from './exceptions/customer.exceptions';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';

/** Customers — tenant-scoped, soft-delete aware. May link to a kalnostics patient. */
@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    if (dto.referredByCustomerId) {
      await this.findById(dto.referredByCustomerId, tenantId);
    }
    return this.prisma.inventoryCustomer.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        creditLimit: dto.creditLimit,
        patientId: dto.patientId,
        referredByCustomerId: dto.referredByCustomerId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Bulk import customers (preview or commit), reusing {@link create}. */
  async import(
    tenantId: string,
    dto: ImportCustomersDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateCustomerDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code ?? row.name,
      validate: (row) => {
        if (!row.name) throw new Error('Missing required field (name)');
      },
      create: (row) => this.create(tenantId, row),
    });
  }

  async findAll(
    tenantId: string,
    query: CustomerQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryCustomerWhereInput = {
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
    if (query.patient === 'true') where.patientId = { not: null };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryCustomer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryCustomer.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const customer = await this.prisma.inventoryCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new CustomerNotFoundException(id);
    return customer;
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto) {
    await this.findById(id, tenantId);
    if (dto.referredByCustomerId) {
      if (dto.referredByCustomerId === id) {
        throw new SelfReferralException();
      }
      await this.findById(dto.referredByCustomerId, tenantId);
    }
    return this.prisma.inventoryCustomer.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        creditLimit: dto.creditLimit,
        patientId: dto.patientId,
        referredByCustomerId: dto.referredByCustomerId,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryCustomer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Deposits / advances ──────────────────────────────────────────────────────
  /** Record a deposit/withdrawal/adjustment against a customer's advance balance. */
  async addDeposit(
    customerId: string,
    tenantId: string,
    dto: CreateCustomerDepositDto,
    actorId?: string,
  ) {
    await this.findById(customerId, tenantId);
    return this.prisma.inventoryCustomerDeposit.create({
      data: {
        tenantId,
        customerId,
        type: dto.type ?? 'DEPOSIT',
        amount: new Prisma.Decimal(dto.amount),
        note: dto.note,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actorId,
      },
    });
  }

  /** List a customer's deposit ledger with the running available balance. */
  async listDeposits(customerId: string, tenantId: string) {
    await this.findById(customerId, tenantId);
    const rows = await this.prisma.inventoryCustomerDeposit.findMany({
      where: { customerId, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    // Balance = deposits − withdrawals (+ signed adjustments).
    const balance = rows.reduce((acc, r) => {
      if (r.type === 'WITHDRAWAL') return acc.sub(r.amount);
      return acc.add(r.amount);
    }, new Prisma.Decimal(0));
    return { deposits: rows, balance };
  }
}
