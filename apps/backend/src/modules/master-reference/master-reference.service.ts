import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  MasterReferenceQueryDto,
  CreateMasterCategoryDto,
  UpdateMasterCategoryDto,
  CreateMasterSubCategoryDto,
  UpdateMasterSubCategoryDto,
  CreateMasterNamedDto,
  UpdateMasterNamedDto,
  CreateMasterTaxRateDto,
  UpdateMasterTaxRateDto,
  CreateMasterFinanceCategoryDto,
  UpdateMasterFinanceCategoryDto,
} from './dto/master-reference.dto';

/** 404 — a reference row was not found (or soft-deleted). */
class ReferenceNotFoundException extends KaltrosException {
  constructor(kind: string, id: string) {
    super(
      'MASTER_REFERENCE_NOT_FOUND',
      `${kind} not found`,
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * SiteAdmin-managed canonical reference data for the global catalogue
 * (categories, sub-categories, units, brands, tax rates). All platform-level
 * (no tenant scope, no RLS) — bare Prisma calls.
 */
@Injectable()
export class MasterReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  private page(query: MasterReferenceQueryDto) {
    return { page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  async listCategories(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterCategoryWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterCategory.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterCategory.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createCategory(dto: CreateMasterCategoryDto, createdBy?: string) {
    return this.prisma.inventoryMasterCategory.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateMasterCategoryDto) {
    await this.ensureCategory(id);
    return this.prisma.inventoryMasterCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
      },
    });
  }

  async removeCategory(id: string) {
    await this.ensureCategory(id);
    return this.prisma.inventoryMasterCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureCategory(id: string) {
    const row = await this.prisma.inventoryMasterCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Category', id);
  }

  // ── Sub-categories ────────────────────────────────────────────────────────────
  async listSubCategories(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterSubCategoryWhereInput = {
      deletedAt: null,
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterSubCategory.findMany({
            where,
            orderBy: { name: 'asc' },
            include: { category: { select: { id: true, name: true } } },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterSubCategory.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createSubCategory(dto: CreateMasterSubCategoryDto, createdBy?: string) {
    await this.ensureCategory(dto.categoryId);
    return this.prisma.inventoryMasterSubCategory.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateSubCategory(id: string, dto: UpdateMasterSubCategoryDto) {
    await this.ensureSubCategory(id);
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);
    return this.prisma.inventoryMasterSubCategory.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive,
      },
    });
  }

  async removeSubCategory(id: string) {
    await this.ensureSubCategory(id);
    return this.prisma.inventoryMasterSubCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureSubCategory(id: string) {
    const row = await this.prisma.inventoryMasterSubCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Sub-category', id);
  }

  // ── Units ──────────────────────────────────────────────────────────────────
  async listUnits(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterUnitWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterUnit.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterUnit.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createUnit(dto: CreateMasterNamedDto, createdBy?: string) {
    return this.prisma.inventoryMasterUnit.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateUnit(id: string, dto: UpdateMasterNamedDto) {
    await this.ensureUnit(id);
    return this.prisma.inventoryMasterUnit.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isActive: dto.isActive },
    });
  }

  async removeUnit(id: string) {
    await this.ensureUnit(id);
    return this.prisma.inventoryMasterUnit.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureUnit(id: string) {
    const row = await this.prisma.inventoryMasterUnit.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Unit', id);
  }

  // ── Brands ──────────────────────────────────────────────────────────────────
  async listBrands(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterBrandWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterBrand.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterBrand.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createBrand(dto: CreateMasterNamedDto, createdBy?: string) {
    return this.prisma.inventoryMasterBrand.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateBrand(id: string, dto: UpdateMasterNamedDto) {
    await this.ensureBrand(id);
    return this.prisma.inventoryMasterBrand.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isActive: dto.isActive },
    });
  }

  async removeBrand(id: string) {
    await this.ensureBrand(id);
    return this.prisma.inventoryMasterBrand.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureBrand(id: string) {
    const row = await this.prisma.inventoryMasterBrand.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Brand', id);
  }

  // ── Tax rates ────────────────────────────────────────────────────────────────
  async listTaxRates(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterTaxRateWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterTaxRate.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterTaxRate.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createTaxRate(dto: CreateMasterTaxRateDto, createdBy?: string) {
    return this.prisma.inventoryMasterTaxRate.create({
      data: {
        name: dto.name,
        rate: dto.rate,
        code: dto.code,
        type: dto.type ?? 'percentage',
        hsnCode: dto.hsnCode,
        cgst: dto.cgst,
        sgst: dto.sgst,
        igst: dto.igst,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateTaxRate(id: string, dto: UpdateMasterTaxRateDto) {
    await this.ensureTaxRate(id);
    return this.prisma.inventoryMasterTaxRate.update({
      where: { id },
      data: {
        name: dto.name,
        rate: dto.rate,
        code: dto.code,
        type: dto.type,
        hsnCode: dto.hsnCode,
        cgst: dto.cgst,
        sgst: dto.sgst,
        igst: dto.igst,
        isActive: dto.isActive,
      },
    });
  }

  async removeTaxRate(id: string) {
    await this.ensureTaxRate(id);
    return this.prisma.inventoryMasterTaxRate.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureTaxRate(id: string) {
    const row = await this.prisma.inventoryMasterTaxRate.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Tax rate', id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────────
  async listVariants(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterVariantWhereInput = { deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterVariant.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterVariant.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createVariant(dto: CreateMasterNamedDto, createdBy?: string) {
    return this.prisma.inventoryMasterVariant.create({
      data: { name: dto.name, isActive: dto.isActive ?? true, createdBy },
    });
  }

  async updateVariant(id: string, dto: UpdateMasterNamedDto) {
    await this.ensureVariant(id);
    return this.prisma.inventoryMasterVariant.update({
      where: { id },
      data: { name: dto.name, isActive: dto.isActive },
    });
  }

  async removeVariant(id: string) {
    await this.ensureVariant(id);
    return this.prisma.inventoryMasterVariant.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureVariant(id: string) {
    const row = await this.prisma.inventoryMasterVariant.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Variant', id);
  }

  // ── Expense categories ────────────────────────────────────────────────────────
  async listExpenseCategories(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterExpenseCategoryWhereInput = {
      deletedAt: null,
    };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterExpenseCategory.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterExpenseCategory.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createExpenseCategory(
    dto: CreateMasterFinanceCategoryDto,
    createdBy?: string,
  ) {
    return this.prisma.inventoryMasterExpenseCategory.create({
      data: {
        name: dto.name,
        code: dto.code,
        taxRateId: dto.taxRateId,
        taxMethod: dto.taxMethod,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateExpenseCategory(id: string, dto: UpdateMasterFinanceCategoryDto) {
    await this.ensureExpenseCategory(id);
    return this.prisma.inventoryMasterExpenseCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        taxRateId: dto.taxRateId,
        taxMethod: dto.taxMethod,
        isActive: dto.isActive,
      },
    });
  }

  async removeExpenseCategory(id: string) {
    await this.ensureExpenseCategory(id);
    return this.prisma.inventoryMasterExpenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureExpenseCategory(id: string) {
    const row = await this.prisma.inventoryMasterExpenseCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Expense category', id);
  }

  // ── Income categories ─────────────────────────────────────────────────────────
  async listIncomeCategories(
    query: MasterReferenceQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = this.page(query);
    const where: Prisma.InventoryMasterIncomeCategoryWhereInput = {
      deletedAt: null,
    };
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction(
      async (tx) =>
        [
          await tx.inventoryMasterIncomeCategory.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          await tx.inventoryMasterIncomeCategory.count({ where }),
        ] as const,
    );
    return { data, total, page, limit };
  }

  async createIncomeCategory(
    dto: CreateMasterFinanceCategoryDto,
    createdBy?: string,
  ) {
    return this.prisma.inventoryMasterIncomeCategory.create({
      data: {
        name: dto.name,
        code: dto.code,
        taxRateId: dto.taxRateId,
        taxMethod: dto.taxMethod,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async updateIncomeCategory(id: string, dto: UpdateMasterFinanceCategoryDto) {
    await this.ensureIncomeCategory(id);
    return this.prisma.inventoryMasterIncomeCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        taxRateId: dto.taxRateId,
        taxMethod: dto.taxMethod,
        isActive: dto.isActive,
      },
    });
  }

  async removeIncomeCategory(id: string) {
    await this.ensureIncomeCategory(id);
    return this.prisma.inventoryMasterIncomeCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  private async ensureIncomeCategory(id: string) {
    const row = await this.prisma.inventoryMasterIncomeCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ReferenceNotFoundException('Income category', id);
  }
}
