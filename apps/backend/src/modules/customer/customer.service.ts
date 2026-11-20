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
import {
  columnFilters,
  ilike,
  NON_PATIENT_WHERE,
  PATIENT_WHERE,
  sortOrder,
} from '../../common/utils/party-list.util';

/**
 * DTO date → Prisma value: a value becomes a Date, an explicit `null` clears the
 * column (edit form emptied the field), and `undefined` leaves it untouched.
 */
const toDate = (v: string | null | undefined): Date | null | undefined =>
  v === null ? null : v ? new Date(v) : undefined;

/** Customers — tenant-scoped, soft-delete aware. May link to a kalnostics patient. */
@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /** EZHT parity fields, picked from create/update DTOs for the Prisma `data`. */
  private parityData(dto: CreateCustomerDto | UpdateCustomerDto) {
    return {
      contactPerson: dto.contactPerson,
      vatNo: dto.vatNo,
      gstNo: dto.gstNo,
      panNo: dto.panNo,
      gstState: dto.gstState,
      customerGroupId: dto.customerGroupId,
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      gender: dto.gender,
      age: dto.age,
      dob: toDate(dto.dob),
      registrationDate: toDate(dto.registrationDate),
      patientType: dto.patientType,
      address2: dto.address2,
      areaId: dto.areaId,
      area: dto.area,
      idType: dto.idType,
      uid: dto.uid,
      countryId: dto.countryId,
      stateId: dto.stateId,
      cityId: dto.cityId,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      postalCode: dto.postalCode,
      ccf1: dto.ccf1,
      ccf2: dto.ccf2,
      ccf3: dto.ccf3,
      ccf4: dto.ccf4,
      ccf5: dto.ccf5,
      ccf6: dto.ccf6,
    };
  }

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
        ...this.parityData(dto),
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
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        'name',
        'code',
        'companyName',
        'phone',
        'email',
        'firstName',
        'lastName',
        'uid',
      ].map((field) => ({ [field]: ilike(search) }));
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;
    const and: Prisma.InventoryCustomerWhereInput[] = columnFilters([
      ['name', query.name],
      ['companyName', query.company],
      ['phone', query.phone],
      ['email', query.email],
      ['gender', query.gender],
      ['patientType', query.patientType],
    ]);
    // Patients vs plain customers — one shared definition (see PATIENT_WHERE).
    if (query.patient === 'true') and.push(PATIENT_WHERE);
    if (query.patient === 'false') and.push(NON_PATIENT_WHERE);
    if (and.length) where.AND = and;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryCustomer.findMany({
        where,
        orderBy: sortOrder(query.sortBy, query.sortDir),
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
        ...this.parityData(dto),
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
