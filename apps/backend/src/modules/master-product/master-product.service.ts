import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../sub-category/sub-category.service';
import { UnitService } from '../unit/unit.service';
import { BrandService } from '../brand/brand.service';
import { TaxRateService } from '../tax-rate/tax-rate.service';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductQueryDto,
} from './dto/master-product.dto';

/** 404 — master product not found (or soft-deleted). */
class MasterProductNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MASTER_PRODUCT_NOT_FOUND',
      'Master product not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Summary returned after a tenant imports masters. */
export interface MasterImportSummary {
  total: number;
  imported: number;
  skipped: number;
}

/**
 * Global master-product catalogue. Writes are SiteAdmin-only (platform-level, no
 * tenant scope — bare Prisma calls, no RLS). Tenants browse importable masters
 * and import copies into their own `inventory_products` via {@link importToTenant}
 * (reusing ProductService so all product-create rules apply), linked back through
 * `sourceMasterProductId` with per-tenant dedupe.
 */
@Injectable()
export class MasterProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: SubCategoryService,
    private readonly unitService: UnitService,
    private readonly brandService: BrandService,
    private readonly taxRateService: TaxRateService,
  ) {}

  // ── SiteAdmin management (platform-level) ───────────────────────────────────
  async create(dto: CreateMasterProductDto, createdBy?: string) {
    return this.prisma.inventoryMasterProduct.create({
      data: {
        name: dto.name,
        code: dto.code,
        category: dto.category,
        subCategory: dto.subCategory,
        unit: dto.unit,
        brand: dto.brand,
        price: dto.price ?? 0,
        cost: dto.cost ?? 0,
        hsnCode: dto.hsnCode,
        taxName: dto.taxName,
        taxRate: dto.taxRate,
        description: dto.description,
        genericName: dto.genericName,
        strength: dto.strength,
        isImportable: dto.isImportable ?? true,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateMasterProductDto) {
    await this.findById(id);
    return this.prisma.inventoryMasterProduct.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        category: dto.category,
        subCategory: dto.subCategory,
        unit: dto.unit,
        brand: dto.brand,
        price: dto.price,
        cost: dto.cost,
        hsnCode: dto.hsnCode,
        taxName: dto.taxName,
        taxRate: dto.taxRate,
        description: dto.description,
        genericName: dto.genericName,
        strength: dto.strength,
        isImportable: dto.isImportable,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.inventoryMasterProduct.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async findById(id: string) {
    const row = await this.prisma.inventoryMasterProduct.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new MasterProductNotFoundException(id);
    return row;
  }

  /** Full catalogue list for SiteAdmin management (active + inactive). */
  async findAllManage(
    query: MasterProductQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    return this.list(query, false);
  }

  // ── Tenant-facing browse + import ───────────────────────────────────────────
  /** Importable, active masters a tenant can choose to import. */
  async browse(
    query: MasterProductQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    return this.list(query, true);
  }

  private async list(
    query: MasterProductQueryDto,
    importableOnly: boolean,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryMasterProductWhereInput = { deletedAt: null };
    if (importableOnly) {
      where.isActive = true;
      where.isImportable = true;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryMasterProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryMasterProduct.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  /**
   * Import the given masters into the caller's tenant catalogue. Each becomes a
   * real product (via ProductService) linked back by `sourceMasterProductId`.
   * Already-imported masters and non-importable/inactive ones are skipped.
   */
  async importToTenant(
    tenantId: string,
    ids: string[],
  ): Promise<MasterImportSummary> {
    let imported = 0;
    let skipped = 0;
    for (const id of ids) {
      const master = await this.prisma.inventoryMasterProduct.findFirst({
        where: { id, deletedAt: null, isActive: true, isImportable: true },
      });
      if (!master) {
        skipped++;
        continue;
      }
      // Dedupe: skip if this tenant already imported this master.
      const existing = await this.prisma.inventoryProduct.findFirst({
        where: { tenantId, sourceMasterProductId: master.id, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const categoryId = await this.resolveCategoryId(
        tenantId,
        master.category,
      );
      const subCategoryId = await this.resolveSubCategoryId(
        tenantId,
        master.subCategory,
        categoryId,
      );
      const unitId = await this.resolveUnitId(tenantId, master.unit);
      const brandId = await this.resolveBrandId(tenantId, master.brand);
      const taxRateId = await this.resolveTaxRateId(
        tenantId,
        master.taxName,
        master.taxRate,
      );
      const code = await this.resolveCode(tenantId, master.code);
      await this.productService.create(tenantId, {
        code,
        name: master.name,
        categoryId,
        subCategoryId,
        unitId,
        brandId,
        taxRateId,
        price: master.price.toNumber(),
        cost: master.cost.toNumber(),
        hsnCode: master.hsnCode ?? undefined,
        description: master.description ?? undefined,
        genericName: master.genericName ?? undefined,
        strength: master.strength ?? undefined,
        sourceMasterProductId: master.id,
      });
      imported++;
    }
    return { total: ids.length, imported, skipped };
  }

  /** Find a tenant category by the master's category name, creating it if absent. */
  private async resolveCategoryId(
    tenantId: string,
    categoryName: string | null,
  ): Promise<string> {
    const name = (categoryName ?? '').trim() || 'Imported';
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.categoryService.create(tenantId, { name });
    return created.id;
  }

  /** Find a tenant sub-category by name under the given category, else create it. */
  private async resolveSubCategoryId(
    tenantId: string,
    name: string | null,
    categoryId: string,
  ): Promise<string | undefined> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return undefined;
    const existing = await this.prisma.inventorySubCategory.findFirst({
      where: {
        tenantId,
        categoryId,
        name: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.subCategoryService.create(tenantId, {
      categoryId,
      name: trimmed,
    });
    return created.id;
  }

  /** Find a tenant unit by name, else create it. */
  private async resolveUnitId(
    tenantId: string,
    name: string | null,
  ): Promise<string | undefined> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return undefined;
    const existing = await this.prisma.inventoryUnit.findFirst({
      where: {
        tenantId,
        name: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.unitService.create(tenantId, { name: trimmed });
    return created.id;
  }

  /** Find a tenant brand by name, else create it. */
  private async resolveBrandId(
    tenantId: string,
    name: string | null,
  ): Promise<string | undefined> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return undefined;
    const existing = await this.prisma.inventoryBrand.findFirst({
      where: {
        tenantId,
        name: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.brandService.create(tenantId, { name: trimmed });
    return created.id;
  }

  /**
   * Find a tenant tax rate by name. If absent, create it — using the master's
   * own rate when set, else the percentage from the global canonical tax rate of
   * the same name (so the form only needs to pick a name). Left unset only when
   * no rate can be determined at all.
   */
  private async resolveTaxRateId(
    tenantId: string,
    name: string | null,
    rate: Prisma.Decimal | null,
  ): Promise<string | undefined> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return undefined;
    const existing = await this.prisma.inventoryTaxRate.findFirst({
      where: {
        tenantId,
        name: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    let rateNum = rate != null ? rate.toNumber() : null;
    if (rateNum == null) {
      const canonical = await this.prisma.inventoryMasterTaxRate.findFirst({
        where: {
          name: { equals: trimmed, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { rate: true },
      });
      if (canonical) rateNum = canonical.rate.toNumber();
    }
    if (rateNum == null) return undefined;
    const created = await this.taxRateService.create(tenantId, {
      name: trimmed,
      rate: rateNum,
    });
    return created.id;
  }

  /** Reuse the master's code when free for the tenant, else generate a new one. */
  private async resolveCode(
    tenantId: string,
    code: string | null,
  ): Promise<string> {
    if (code) {
      const taken = await this.prisma.inventoryProduct.findFirst({
        where: { tenantId, code, deletedAt: null },
        select: { id: true },
      });
      if (!taken) return code;
    }
    return generateReference('PR');
  }
}
