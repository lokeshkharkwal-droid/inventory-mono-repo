import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import { ProductService } from './product.service';
import { ImportProductsDto } from './dto/import-products.dto';
import {
  CreateProductDto,
  ProductVariantInputDto,
} from './dto/create-product.dto';
import {
  UpdateImportProductsDto,
  UpdateImportRowDto,
} from './dto/update-import.dto';
import { ImportCsvProductsDto, ImportCsvRowDto } from './dto/import-csv.dto';

export type { ImportSummary } from '../../common/utils/bulk-import.util';

/** Map the legacy lower-case sales method to the canonical enum. */
function mapSalesMethod(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase() === 'pack_size' ? 'PACK' : 'INDIVIDUAL';
}

/** Map the legacy lower-case tax method to the canonical enum. */
function mapTaxMethod(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase() === 'exclusive' ? 'EXCLUSIVE' : 'INCLUSIVE';
}

/**
 * Bulk product import. The frontend parses CSV/Excel into rows; this validates
 * references + code uniqueness and (unless `dryRun`) creates each product,
 * reporting a per-row result so partial failures are visible (mirrors the legacy
 * import preview → commit flow). Built on the shared {@link runBulkImport}.
 */
@Injectable()
export class ProductImportService {
  constructor(
    private readonly productService: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  async import(
    tenantId: string,
    dto: ImportProductsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateProductDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code,
      validate: (row) => {
        if (!row.code || !row.name || !row.categoryId) {
          throw new Error('Missing required field (code, name, categoryId)');
        }
      },
      create: (row) => this.productService.create(tenantId, row),
    });
  }

  /**
   * Import products from the EZHT 29-column CSV (`import_csv`). References arrive
   * as codes/names and are resolved to tenant ids here (created on the fly when
   * absent, mirroring the legacy `getCategoryByCode`/`getMasterManufacturerByName`
   * behaviour); variants come as a pipe-separated string.
   */
  async importCsv(
    tenantId: string,
    dto: ImportCsvProductsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<ImportCsvRowDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code,
      validate: (row) => {
        if (!row.code || !row.name) {
          throw new Error('Missing required field (code, name)');
        }
      },
      create: async (row) => {
        const create = await this.csvRowToCreateDto(tenantId, row);
        return this.productService.create(tenantId, create);
      },
    });
  }

  /** Resolve a parsed CSV row into a {@link CreateProductDto} (references → ids). */
  private async csvRowToCreateDto(
    tenantId: string,
    row: ImportCsvRowDto,
  ): Promise<CreateProductDto> {
    const categoryId = await this.resolveCategoryId(tenantId, row.categoryCode);
    const subCategoryId = await this.resolveSubCategoryId(
      tenantId,
      row.subCategoryCode,
      categoryId,
    );
    const unitId = await this.resolveUnitId(tenantId, row.unit);
    const taxRateId = await this.resolveTaxRateId(tenantId, row.taxRateName);
    const manufacturerId = await this.resolveManufacturerId(
      tenantId,
      row.manufacturer,
    );
    const variants: ProductVariantInputDto[] | undefined = row.variants
      ? row.variants
          .split('|')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((name) => ({ name }))
      : undefined;

    return {
      code: row.code,
      name: row.name,
      categoryId,
      subCategoryId,
      unitId,
      taxRateId,
      manufacturerId,
      packSize: row.packSize,
      salesMethod: mapSalesMethod(row.salesMethod),
      packCost: row.packCost,
      cost: row.cost,
      packMrp: row.packMrp,
      price: row.price,
      alertQuantity: row.alertQuantity,
      hsnCode: row.hsnCode,
      taxMethod: mapTaxMethod(row.taxMethodSales),
      taxMethodPurchase: mapTaxMethod(row.taxMethodPurchase),
      cf1: row.cf1,
      cf2: row.cf2,
      cf3: row.cf3,
      cf4: row.cf4,
      cf5: row.cf5,
      cf6: row.cf6,
      cf7: row.cf7,
      cf8: row.cf8,
      cf9: row.cf9,
      cf10: row.cf10,
      cf11: row.cf11,
      variants,
    };
  }

  /** Category by code (required); created minimally when the code is unknown. */
  private async resolveCategoryId(
    tenantId: string,
    code: string | undefined,
  ): Promise<string> {
    const raw = code?.trim();
    if (!raw) {
      throw new Error('Missing required field (Category Code)');
    }
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { tenantId, code: raw, deletedAt: null },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventoryCategory.create({
      data: { tenantId, code: raw, name: raw },
      select: { id: true },
    });
    return created.id;
  }

  /** Subcategory by code within a category; created when the code is unknown. */
  private async resolveSubCategoryId(
    tenantId: string,
    code: string | undefined,
    categoryId: string,
  ): Promise<string | undefined> {
    const raw = code?.trim();
    if (!raw) return undefined;
    const existing = await this.prisma.inventorySubCategory.findFirst({
      where: { tenantId, code: raw, categoryId, deletedAt: null },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventorySubCategory.create({
      data: { tenantId, categoryId, code: raw, name: raw },
      select: { id: true },
    });
    return created.id;
  }

  /** Unit by name/code; created when unknown. */
  private async resolveUnitId(
    tenantId: string,
    name: string | undefined,
  ): Promise<string | undefined> {
    const raw = name?.trim();
    if (!raw) return undefined;
    const existing = await this.prisma.inventoryUnit.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ code: raw }, { name: raw }],
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventoryUnit.create({
      data: { tenantId, code: raw, name: raw },
      select: { id: true },
    });
    return created.id;
  }

  /** Tax rate by name; null when the name doesn't match an existing rate. */
  private async resolveTaxRateId(
    tenantId: string,
    name: string | undefined,
  ): Promise<string | undefined> {
    const raw = name?.trim();
    if (!raw) return undefined;
    const existing = await this.prisma.inventoryTaxRate.findFirst({
      where: { tenantId, name: raw, deletedAt: null },
      select: { id: true },
    });
    return existing?.id;
  }

  /** Manufacturer by name; created when unknown (EZHT auto-creates). */
  private async resolveManufacturerId(
    tenantId: string,
    name: string | undefined,
  ): Promise<string | undefined> {
    const raw = name?.trim();
    if (!raw) return undefined;
    const existing = await this.prisma.inventoryManufacturer.findFirst({
      where: { tenantId, name: raw, deletedAt: null },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventoryManufacturer.create({
      data: { tenantId, name: raw },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Update existing products (matched by `code`) from parsed CSV rows (EZHT
   * `update_csv`). Reference columns (category/subcategory codes, tax name) are
   * resolved to ids; omitted/blank fields leave the product untouched. Reports a
   * per-row result; rows whose `code` matches no product fail.
   */
  async updateImport(
    tenantId: string,
    dto: UpdateImportProductsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<UpdateImportRowDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code,
      validate: (row) => {
        if (!row.code) throw new Error('Missing required field (code)');
      },
      create: async (row) => {
        const product = await this.productService.findByCode(
          tenantId,
          row.code,
        );
        const categoryId = row.categoryCode
          ? await this.resolveCategoryId(tenantId, row.categoryCode)
          : undefined;
        const subCategoryId = row.subCategoryCode
          ? await this.resolveSubCategoryId(
              tenantId,
              row.subCategoryCode,
              categoryId ??
                (await this.productCategoryId(tenantId, product.id)),
            )
          : undefined;
        const unitId = row.unit
          ? await this.resolveUnitId(tenantId, row.unit)
          : undefined;
        const taxRateId = row.taxRateName
          ? await this.resolveTaxRateId(tenantId, row.taxRateName)
          : undefined;
        return this.productService.update(product.id, tenantId, {
          name: row.name,
          categoryId,
          subCategoryId,
          unitId,
          taxRateId,
          packSize: row.packSize,
          salesMethod: mapSalesMethod(row.salesMethod),
          packCost: row.packCost,
          cost: row.cost,
          packMrp: row.packMrp,
          price: row.price,
          alertQuantity: row.alertQuantity,
          hsnCode: row.hsnCode,
          taxMethod: mapTaxMethod(row.taxMethodSales),
          taxMethodPurchase: mapTaxMethod(row.taxMethodPurchase),
        });
      },
    });
  }

  /** The current category id of a product (for subcategory resolution). */
  private async productCategoryId(
    tenantId: string,
    productId: string,
  ): Promise<string> {
    const p = await this.prisma.inventoryProduct.findFirst({
      where: { id: productId, tenantId },
      select: { categoryId: true },
    });
    return p!.categoryId;
  }
}
