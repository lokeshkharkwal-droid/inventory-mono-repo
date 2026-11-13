import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CatalogQueryDto,
  CreateMasterFinanceCategoryDto,
  CreateMasterManufacturerDto,
  CreateMasterProformaDto,
  CreateMasterSupplierDto,
  MasterProformaItemDto,
  UpdateMasterFinanceCategoryDto,
  UpdateMasterManufacturerDto,
  UpdateMasterProformaDto,
  UpdateMasterSupplierDto,
} from './master-catalog.dto';

class CatalogNotFoundException extends KaltrosException {
  constructor(kind: string, id: string) {
    super(
      'MASTER_CATALOG_NOT_FOUND',
      `${kind} not found`,
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

const SETTINGS_ID = 'default';

/** SiteAdmin-managed platform-level catalogue: suppliers, manufacturers, finance categories, proformas, settings. */
@Injectable()
export class MasterCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private page(q: CatalogQueryDto) {
    return { page: q.page ?? 1, limit: q.limit ?? 20 };
  }

  // ── Suppliers ───────────────────────────────────────────────────────────────
  private supplierWhere(q: CatalogQueryDto): Prisma.InventoryMasterSupplierWhereInput {
    const where: Prisma.InventoryMasterSupplierWhereInput = { deletedAt: null };
    if (q.search)
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search, mode: 'insensitive' } },
      ];
    return where;
  }

  async listSuppliers(q: CatalogQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(q);
    const where = this.supplierWhere(q);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMasterSupplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryMasterSupplier.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Active suppliers as `{ id, name }` for select inputs. */
  async supplierOptions(q: CatalogQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(q);
    const where = { ...this.supplierWhere(q), isActive: true };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryMasterSupplier.findMany({
        where,
        select: { id: true, name: true, company: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryMasterSupplier.count({ where }),
    ]);
    return { data: rows, total, page, limit };
  }

  async createSupplier(dto: CreateMasterSupplierDto, by?: string) {
    return this.prisma.inventoryMasterSupplier.create({
      data: { ...dto, isActive: dto.isActive ?? true, createdBy: by },
    });
  }

  async updateSupplier(id: string, dto: UpdateMasterSupplierDto) {
    await this.ensure('Supplier', id, () =>
      this.prisma.inventoryMasterSupplier.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    return this.prisma.inventoryMasterSupplier.update({ where: { id }, data: dto });
  }

  async removeSupplier(id: string) {
    await this.ensure('Supplier', id, () =>
      this.prisma.inventoryMasterSupplier.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    return this.prisma.inventoryMasterSupplier.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Manufacturers ───────────────────────────────────────────────────────────
  async listManufacturers(q: CatalogQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(q);
    const where: Prisma.InventoryMasterManufacturerWhereInput = { deletedAt: null };
    if (q.search)
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search, mode: 'insensitive' } },
      ];
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMasterManufacturer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryMasterManufacturer.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async createManufacturer(dto: CreateMasterManufacturerDto, by?: string) {
    return this.prisma.inventoryMasterManufacturer.create({
      data: { ...dto, isActive: dto.isActive ?? true, createdBy: by },
    });
  }

  async updateManufacturer(id: string, dto: UpdateMasterManufacturerDto) {
    await this.ensure('Manufacturer', id, () =>
      this.prisma.inventoryMasterManufacturer.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    return this.prisma.inventoryMasterManufacturer.update({ where: { id }, data: dto });
  }

  async removeManufacturer(id: string) {
    await this.ensure('Manufacturer', id, () =>
      this.prisma.inventoryMasterManufacturer.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    return this.prisma.inventoryMasterManufacturer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Expense / income categories ─────────────────────────────────────────────
  private fin(kind: 'expense' | 'income') {
    return kind === 'expense'
      ? this.prisma.inventoryMasterExpenseCategory
      : this.prisma.inventoryMasterIncomeCategory;
  }

  private async ensureTaxRate(id?: string) {
    if (!id) return;
    await this.ensure('Tax rate', id, () =>
      this.prisma.inventoryMasterTaxRate.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
  }

  async listFinance(kind: 'expense' | 'income', q: CatalogQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page({ ...q, limit: q.limit ?? 50 });
    const where: { deletedAt: null; name?: { contains: string; mode: 'insensitive' } } = { deletedAt: null };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const d = this.fin(kind) as typeof this.prisma.inventoryMasterExpenseCategory;
    const [data, total] = await this.prisma.$transaction([
      d.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { taxRate: { select: { id: true, name: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      d.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async createFinance(kind: 'expense' | 'income', dto: CreateMasterFinanceCategoryDto, by?: string) {
    await this.ensureTaxRate(dto.taxRateId);
    const d = this.fin(kind) as typeof this.prisma.inventoryMasterExpenseCategory;
    return d.create({
      data: {
        code: dto.code,
        name: dto.name,
        taxRateId: dto.taxRateId,
        taxMethod: dto.taxMethod ?? 'EXCLUSIVE',
        isActive: dto.isActive ?? true,
        createdBy: by,
      },
      include: { taxRate: { select: { id: true, name: true } } },
    });
  }

  async updateFinance(kind: 'expense' | 'income', id: string, dto: UpdateMasterFinanceCategoryDto) {
    const d = this.fin(kind) as typeof this.prisma.inventoryMasterExpenseCategory;
    await this.ensure(`${kind} category`, id, () => d.findFirst({ where: { id, deletedAt: null }, select: { id: true } }));
    await this.ensureTaxRate(dto.taxRateId);
    return d.update({
      where: { id },
      data: dto,
      include: { taxRate: { select: { id: true, name: true } } },
    });
  }

  async removeFinance(kind: 'expense' | 'income', id: string) {
    const d = this.fin(kind) as typeof this.prisma.inventoryMasterExpenseCategory;
    await this.ensure(`${kind} category`, id, () => d.findFirst({ where: { id, deletedAt: null }, select: { id: true } }));
    return d.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true, deletedAt: true } });
  }

  // ── Proformas ───────────────────────────────────────────────────────────────
  private shapeProforma<T extends { items?: { quantity: Prisma.Decimal }[] }>(p: T) {
    if (!p.items) return p;
    return { ...p, items: p.items.map((i) => ({ ...i, quantity: Number(i.quantity) })) };
  }

  private async itemRows(items?: MasterProformaItemDto[]) {
    const rows = (items ?? []).map((i) => ({
      masterProductId: i.masterProductId || null,
      labTestId: i.labTestId || null,
      quantity: i.quantity,
    }));
    for (const r of rows) {
      if (!r.masterProductId && !r.labTestId)
        throw new KaltrosException(
          'MASTER_PROFORMA_ITEM_INVALID',
          'Each proforma line needs a product or a lab test',
          {},
          HttpStatus.BAD_REQUEST,
        );
    }
    const ids = [...new Set(rows.map((r) => r.masterProductId).filter(Boolean))] as string[];
    if (ids.length) {
      const found = await this.prisma.inventoryMasterProduct.count({
        where: { id: { in: ids }, deletedAt: null },
      });
      if (found !== ids.length)
        throw new KaltrosException(
          'MASTER_PROFORMA_ITEM_INVALID',
          'One or more products were not found',
          {},
          HttpStatus.BAD_REQUEST,
        );
    }
    return rows;
  }

  async listProformas(q: CatalogQueryDto): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(q);
    const where: Prisma.InventoryMasterProformaWhereInput = { deletedAt: null };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMasterProforma.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryMasterProforma.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getProforma(id: string) {
    const row = await this.prisma.inventoryMasterProforma.findFirst({
      where: { id, deletedAt: null },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new CatalogNotFoundException('Proforma', id);
    return this.shapeProforma(row);
  }

  async createProforma(dto: CreateMasterProformaDto, by?: string) {
    const items = await this.itemRows(dto.items);
    const row = await this.prisma.inventoryMasterProforma.create({
      data: {
        name: dto.name,
        date: dto.date ? new Date(dto.date) : undefined,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
        createdBy: by,
        items: { create: items },
      },
      include: { items: true },
    });
    return this.shapeProforma(row);
  }

  async updateProforma(id: string, dto: UpdateMasterProformaDto) {
    await this.ensure('Proforma', id, () =>
      this.prisma.inventoryMasterProforma.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    const items = dto.items ? await this.itemRows(dto.items) : undefined;
    const row = await this.prisma.$transaction(async (tx) => {
      if (items) await tx.inventoryMasterProformaItem.deleteMany({ where: { proformaId: id } });
      return tx.inventoryMasterProforma.update({
        where: { id },
        data: {
          name: dto.name,
          date: dto.date ? new Date(dto.date) : undefined,
          status: dto.status,
          notes: dto.notes,
          ...(items ? { items: { create: items } } : {}),
        },
        include: { items: true },
      });
    });
    return this.shapeProforma(row);
  }

  async removeProforma(id: string) {
    await this.ensure('Proforma', id, () =>
      this.prisma.inventoryMasterProforma.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
    );
    return this.prisma.inventoryMasterProforma.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Settings (singleton, shallow-merge) ─────────────────────────────────────
  async getSettings() {
    const row = await this.prisma.inventoryMasterSetting.findUnique({ where: { id: SETTINGS_ID } });
    return row ?? { id: SETTINGS_ID, data: {}, updatedAt: null };
  }

  async saveSettings(data: Record<string, unknown>, by?: string) {
    const existing = await this.prisma.inventoryMasterSetting.findUnique({ where: { id: SETTINGS_ID } });
    const merged = {
      ...((existing?.data as Record<string, unknown> | null) ?? {}),
      ...data,
    } as Prisma.InputJsonObject;
    return this.prisma.inventoryMasterSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, data: merged, updatedBy: by },
      update: { data: merged, updatedBy: by },
    });
  }

  private async ensure(kind: string, id: string, find: () => Promise<unknown>) {
    if (!(await find())) throw new CatalogNotFoundException(kind, id);
  }
}
