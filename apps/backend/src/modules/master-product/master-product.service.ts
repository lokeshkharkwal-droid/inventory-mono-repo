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
  MasterProductVariantDto,
  MasterProductSupplierDto,
  MasterComboItemDto,
  MasterProductDrugDto,
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
  /**
   * Create a global master product, with its optional variants/suppliers/combo
   * sub-rows, in a single transaction.
   * @param dto the create payload (scalars + nested sub-entity arrays).
   * @param createdBy the SiteAdmin id from the token.
   * @returns the created master product with its sub-entities.
   */
  async create(dto: CreateMasterProductDto, createdBy?: string) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMasterProduct.create({
        data: {
          ...this.toScalarData(dto),
          name: dto.name,
          price: dto.price ?? 0,
          cost: dto.cost ?? 0,
          type: dto.type ?? 'standard',
          barcodeSymbology: dto.barcodeSymbology ?? 'code128',
          isImportable: dto.isImportable ?? true,
          isActive: dto.isActive ?? true,
          isTrackQuantity: dto.isTrackQuantity ?? true,
          hasVariants: dto.hasVariants ?? false,
          createdBy,
        },
      });
      await this.writeSubEntities(tx, created.id, dto, false);
      return this.findWithRelations(tx, created.id);
    });
  }

  /**
   * Update a global master product. Provided sub-entity arrays replace the
   * existing rows; omitted arrays leave them untouched.
   * @param id the master product id.
   * @param dto the partial update payload.
   * @returns the updated master product with its sub-entities.
   */
  async update(id: string, dto: UpdateMasterProductDto) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryMasterProduct.update({
        where: { id },
        data: {
          ...this.toScalarData(dto),
          name: dto.name,
          price: dto.price,
          cost: dto.cost,
          type: dto.type,
          barcodeSymbology: dto.barcodeSymbology,
          isImportable: dto.isImportable,
          isActive: dto.isActive,
          isTrackQuantity: dto.isTrackQuantity,
          hasVariants: dto.hasVariants,
        },
      });
      await this.writeSubEntities(tx, id, dto, true);
      return this.findWithRelations(tx, id);
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

  /**
   * Full detail of a single master product, including its variants, suppliers
   * and combo items.
   * @param id the master product id.
   * @returns the master product with its sub-entities.
   * @throws MasterProductNotFoundException when absent or soft-deleted.
   */
  async findOne(id: string) {
    await this.findById(id);
    return this.findWithRelations(this.prisma, id);
  }

  /**
   * Deep-copy a master product (and its variants/suppliers/combo items) as a
   * new row. The copy's name gets a " (copy)" suffix and its code is cleared.
   * @param id the source master product id.
   * @param createdBy the SiteAdmin id from the token.
   * @returns the newly created copy with its sub-entities.
   */
  async duplicate(id: string, createdBy?: string) {
    const source = await this.prisma.inventoryMasterProduct.findFirst({
      where: { id, deletedAt: null },
      include: {
        variants: true,
        suppliers: true,
        comboItems: true,
        drugs: true,
      },
    });
    if (!source) throw new MasterProductNotFoundException(id);
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.inventoryMasterProduct.create({
        data: {
          name: `${source.name} (copy)`,
          code: null,
          category: source.category,
          subCategory: source.subCategory,
          unit: source.unit,
          brand: source.brand,
          price: source.price,
          cost: source.cost,
          hsnCode: source.hsnCode,
          taxName: source.taxName,
          taxRate: source.taxRate,
          description: source.description,
          genericName: source.genericName,
          strength: source.strength,
          isImportable: source.isImportable,
          isActive: source.isActive,
          type: source.type,
          barcodeSymbology: source.barcodeSymbology,
          categoryId: source.categoryId,
          subCategoryId: source.subCategoryId,
          unitId: source.unitId,
          brandId: source.brandId,
          taxRateId: source.taxRateId,
          manufacturerId: source.manufacturerId,
          packSize: source.packSize,
          salesMethod: source.salesMethod,
          packCost: source.packCost,
          packMrp: source.packMrp,
          taxMethod: source.taxMethod,
          taxMethodPurchase: source.taxMethodPurchase,
          alertQuantity: source.alertQuantity,
          isTrackQuantity: source.isTrackQuantity,
          imageUrl: source.imageUrl,
          galleryImageUrls: source.galleryImageUrls,
          composition: source.composition,
          unitType: source.unitType,
          formulation: source.formulation,
          route: source.route,
          frequency: source.frequency,
          numberOfDays: source.numberOfDays,
          prescriptionQuantity: source.prescriptionQuantity,
          refills: source.refills,
          refillTimes: source.refillTimes,
          prescriptionNotes: source.prescriptionNotes,
          cf1: source.cf1,
          cf2: source.cf2,
          cf3: source.cf3,
          cf4: source.cf4,
          cf5: source.cf5,
          cf6: source.cf6,
          cf7: source.cf7,
          cf8: source.cf8,
          cf9: source.cf9,
          cf10: source.cf10,
          cf11: source.cf11,
          invoiceDetails: source.invoiceDetails,
          hasVariants: source.hasVariants,
          digitalFileUrl: source.digitalFileUrl,
          createdBy,
        },
      });
      if (source.variants.length) {
        await tx.inventoryMasterProductVariant.createMany({
          data: source.variants.map((v) => ({
            productId: copy.id,
            name: v.name,
            cost: v.cost,
            price: v.price,
          })),
        });
      }
      if (source.suppliers.length) {
        await tx.inventoryMasterProductSupplier.createMany({
          data: source.suppliers.map((s) => ({
            productId: copy.id,
            supplierId: s.supplierId,
            partNumber: s.partNumber,
            price: s.price,
          })),
        });
      }
      if (source.comboItems.length) {
        await tx.inventoryMasterComboItem.createMany({
          data: source.comboItems.map((c) => ({
            productId: copy.id,
            itemProductId: c.itemProductId,
            quantity: c.quantity,
            price: c.price,
          })),
        });
      }
      if (source.drugs.length) {
        await tx.inventoryMasterProductDrug.createMany({
          data: source.drugs.map((d) => ({
            productId: copy.id,
            name: d.name,
            unitValue: d.unitValue,
            unit: d.unit,
          })),
        });
      }
      return this.findWithRelations(tx, copy.id);
    });
  }

  /**
   * Map the EZHT scalar fields shared by create/update to a Prisma data object.
   * `name`, the defaulted scalars and the sub-entity arrays are handled by the
   * callers; this covers the plain pass-through columns.
   */
  private toScalarData(dto: CreateMasterProductDto | UpdateMasterProductDto) {
    return {
      code: dto.code,
      category: dto.category,
      subCategory: dto.subCategory,
      unit: dto.unit,
      brand: dto.brand,
      hsnCode: dto.hsnCode,
      taxName: dto.taxName,
      taxRate: dto.taxRate,
      description: dto.description,
      genericName: dto.genericName,
      strength: dto.strength,
      categoryId: dto.categoryId,
      subCategoryId: dto.subCategoryId,
      unitId: dto.unitId,
      brandId: dto.brandId,
      taxRateId: dto.taxRateId,
      manufacturerId: dto.manufacturerId,
      packSize: dto.packSize,
      salesMethod: dto.salesMethod,
      packCost: dto.packCost,
      packMrp: dto.packMrp,
      taxMethod: dto.taxMethod,
      taxMethodPurchase: dto.taxMethodPurchase,
      alertQuantity: dto.alertQuantity,
      imageUrl: dto.imageUrl,
      galleryImageUrls: dto.galleryImageUrls,
      composition: dto.composition,
      unitType: dto.unitType,
      formulation: dto.formulation,
      route: dto.route,
      frequency: dto.frequency,
      numberOfDays: dto.numberOfDays,
      prescriptionQuantity: dto.prescriptionQuantity,
      refills: dto.refills,
      refillTimes: dto.refillTimes,
      prescriptionNotes: dto.prescriptionNotes,
      cf1: dto.cf1,
      cf2: dto.cf2,
      cf3: dto.cf3,
      cf4: dto.cf4,
      cf5: dto.cf5,
      cf6: dto.cf6,
      cf7: dto.cf7,
      cf8: dto.cf8,
      cf9: dto.cf9,
      cf10: dto.cf10,
      cf11: dto.cf11,
      invoiceDetails: dto.invoiceDetails,
      digitalFileUrl: dto.digitalFileUrl,
    };
  }

  /**
   * Replace the variants/suppliers/combo sub-rows for a master product. Each
   * array is only touched when present on the DTO; on create (`isUpdate` false)
   * there is nothing to delete first.
   */
  private async writeSubEntities(
    tx: Prisma.TransactionClient,
    productId: string,
    dto: CreateMasterProductDto | UpdateMasterProductDto,
    isUpdate: boolean,
  ): Promise<void> {
    if (dto.variants) {
      if (isUpdate) {
        await tx.inventoryMasterProductVariant.deleteMany({
          where: { productId },
        });
      }
      await this.createVariants(tx, productId, dto.variants);
    }
    if (dto.suppliers) {
      if (isUpdate) {
        await tx.inventoryMasterProductSupplier.deleteMany({
          where: { productId },
        });
      }
      await this.createSuppliers(tx, productId, dto.suppliers);
    }
    if (dto.comboItems) {
      if (isUpdate) {
        await tx.inventoryMasterComboItem.deleteMany({ where: { productId } });
      }
      await this.createComboItems(tx, productId, dto.comboItems);
    }
  }

  /** Insert variant rows for a master product. */
  private async createVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    variants: MasterProductVariantDto[],
  ): Promise<void> {
    if (!variants.length) return;
    await tx.inventoryMasterProductVariant.createMany({
      data: variants.map((v) => ({
        productId,
        name: v.name,
        cost: v.cost ?? 0,
        price: v.price ?? 0,
      })),
    });
  }

  /** Insert supplier-config rows for a master product. */
  private async createSuppliers(
    tx: Prisma.TransactionClient,
    productId: string,
    suppliers: MasterProductSupplierDto[],
  ): Promise<void> {
    if (!suppliers.length) return;
    await tx.inventoryMasterProductSupplier.createMany({
      data: suppliers.map((s) => ({
        productId,
        supplierId: s.supplierId,
        partNumber: s.partNumber,
        price: s.price,
      })),
    });
  }

  /** Insert combo-item rows for a master product. */
  private async createComboItems(
    tx: Prisma.TransactionClient,
    productId: string,
    comboItems: MasterComboItemDto[],
  ): Promise<void> {
    if (!comboItems.length) return;
    await tx.inventoryMasterComboItem.createMany({
      data: comboItems.map((c) => ({
        productId,
        itemProductId: c.itemProductId,
        quantity: c.quantity ?? 1,
        price: c.price ?? 0,
      })),
    });
  }

  // ── Product drug-composition (EZHT "Drugs" modal) ───────────────────────────
  /**
   * List a master product's drug-composition rows (drug name + unit value + unit).
   * @param productId the master product id.
   * @returns the product's drug rows, newest first.
   * @throws MasterProductNotFoundException when the product is absent.
   */
  async listDrugs(productId: string) {
    await this.findById(productId);
    return this.prisma.inventoryMasterProductDrug.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add a drug-composition row to a master product.
   * @param productId the master product id.
   * @param dto the drug row (name required; unit value + unit optional).
   * @returns the created drug row.
   * @throws MasterProductNotFoundException when the product is absent.
   */
  async addDrug(productId: string, dto: MasterProductDrugDto) {
    await this.findById(productId);
    return this.prisma.inventoryMasterProductDrug.create({
      data: {
        productId,
        name: dto.name,
        unitValue: dto.unitValue,
        unit: dto.unit,
      },
    });
  }

  /**
   * Delete a single drug-composition row from a master product.
   * @param productId the master product id.
   * @param drugId the drug row id.
   * @returns the deleted row's id.
   * @throws MasterProductNotFoundException when the product/row is absent.
   */
  async removeDrug(productId: string, drugId: string) {
    await this.findById(productId);
    const row = await this.prisma.inventoryMasterProductDrug.findFirst({
      where: { id: drugId, productId },
      select: { id: true },
    });
    if (!row) throw new MasterProductNotFoundException(drugId);
    await this.prisma.inventoryMasterProductDrug.delete({
      where: { id: drugId },
    });
    return { id: drugId };
  }

  /**
   * Load a master product together with its sub-entities, enriched for the UI:
   * each supplier row gets its supplier's display `name`, and each combo item
   * gets its referenced product's `itemProductName` (so the edit form can show
   * names rather than bare ids).
   */
  private async findWithRelations(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ) {
    const row = await tx.inventoryMasterProduct.findUniqueOrThrow({
      where: { id },
      include: {
        variants: true,
        suppliers: { include: { supplier: { select: { name: true } } } },
        comboItems: true,
        drugs: true,
      },
    });
    const suppliers = row.suppliers.map((s) => ({
      ...s,
      supplierName: s.supplier?.name ?? null,
    }));
    let comboItems = row.comboItems as Array<
      (typeof row.comboItems)[number] & { itemProductName?: string | null }
    >;
    if (row.comboItems.length) {
      const items = await tx.inventoryMasterProduct.findMany({
        where: { id: { in: row.comboItems.map((c) => c.itemProductId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(items.map((i) => [i.id, i.name]));
      comboItems = row.comboItems.map((c) => ({
        ...c,
        itemProductName: nameById.get(c.itemProductId) ?? null,
      }));
    }
    return { ...row, suppliers, comboItems };
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
        { brand: { contains: query.search, mode: 'insensitive' } },
        { genericName: { contains: query.search, mode: 'insensitive' } },
        { hsnCode: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryMasterProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { variants: true, suppliers: true, comboItems: true },
          },
        },
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
