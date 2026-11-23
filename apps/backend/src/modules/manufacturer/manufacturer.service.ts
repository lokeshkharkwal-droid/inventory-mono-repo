import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import {
  columnFilters,
  ilike,
  sortOrder,
} from '../../common/utils/party-list.util';
import {
  CreateManufacturerDto,
  UpdateManufacturerDto,
  ManufacturerQueryDto,
  ImportManufacturersDto,
} from './dto/manufacturer.dto';
import {
  ManufacturerCodeConflictException,
  ManufacturerNotFoundException,
} from './exceptions/manufacturer.exceptions';

const SELECT = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  companyName: true,
  phone: true,
  email: true,
  website: true,
  address: true,
  imageUrl: true,
  note: true,
  isActive: true,
  contactPerson: true,
  vatNo: true,
  countryId: true,
  stateId: true,
  cityId: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  invoiceFooter: true,
  cf1: true,
  cf2: true,
  cf3: true,
  cf4: true,
  cf5: true,
  cf6: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InventoryManufacturerSelect;

/** Manufacturers — maker companies/parties, tenant-scoped, soft-delete aware. */
@Injectable()
export class ManufacturerService {
  constructor(private readonly prisma: PrismaService) {}

  /** EZHT parity fields, picked from create/update DTOs for the Prisma `data`. */
  private parityData(dto: CreateManufacturerDto | UpdateManufacturerDto) {
    return {
      contactPerson: dto.contactPerson,
      vatNo: dto.vatNo,
      countryId: dto.countryId,
      stateId: dto.stateId,
      cityId: dto.cityId,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      invoiceFooter: dto.invoiceFooter,
      cf1: dto.cf1,
      cf2: dto.cf2,
      cf3: dto.cf3,
      cf4: dto.cf4,
      cf5: dto.cf5,
      cf6: dto.cf6,
    };
  }

  async create(tenantId: string, dto: CreateManufacturerDto) {
    if (dto.code) await this.assertCodeFree(tenantId, dto.code);
    return this.prisma.inventoryManufacturer.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        imageUrl: dto.imageUrl,
        note: dto.note,
        isActive: dto.isActive ?? true,
        ...this.parityData(dto),
      },
      select: SELECT,
    });
  }

  /** Bulk import manufacturers (preview or commit), reusing {@link create}. */
  async import(
    tenantId: string,
    dto: ImportManufacturersDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateManufacturerDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code ?? row.name,
      validate: (row) => {
        if (!row.name) throw new Error('Missing required field (name)');
      },
      create: (row) => this.create(tenantId, row),
    });
  }

  async findAll(
    tenantId: string,
    query: ManufacturerQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryManufacturerWhereInput = {
      tenantId,
      deletedAt: null,
    };
    const search = query.search?.trim();
    if (search) {
      // Global search spans every column of the reference list table.
      where.OR = [
        'name',
        'code',
        'companyName',
        'vatNo',
        'phone',
        'email',
        'city',
        'state',
        'country',
      ].map((field) => ({ [field]: ilike(search) }));
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;
    const filters = columnFilters([
      ['companyName', query.company],
      ['name', query.name],
      ['vatNo', query.vatNo],
      ['phone', query.phone],
      ['email', query.email],
      ['city', query.city],
      ['country', query.country],
    ]);
    if (filters.length) where.AND = filters;

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryManufacturer.findMany({
        where,
        select: SELECT,
        orderBy: sortOrder(query.sortBy, query.sortDir),
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryManufacturer.count({ where });
      return [rows, count] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryManufacturer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: SELECT,
    });
    if (!row) throw new ManufacturerNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateManufacturerDto) {
    await this.findById(id, tenantId);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);
    return this.prisma.inventoryManufacturer.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        companyName: dto.companyName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        imageUrl: dto.imageUrl,
        note: dto.note,
        isActive: dto.isActive,
        ...this.parityData(dto),
      },
      select: SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryManufacturer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryManufacturer.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ManufacturerCodeConflictException(code);
  }
}
