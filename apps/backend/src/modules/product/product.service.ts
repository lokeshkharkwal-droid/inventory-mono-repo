import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../sub-category/sub-category.service';
import { UnitService } from '../unit/unit.service';
import { BrandService } from '../brand/brand.service';
import { TaxRateService } from '../tax-rate/tax-rate.service';
import { TenantRegistryService } from '../alerts/tenant-registry.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { BulkPriceUpdateDto } from './dto/product-tools.dto';
import {
  BranchRequiredException,
  ProductCodeConflictException,
  ProductNotFoundException,
} from './exceptions/product.exceptions';

/** Relations returned when fetching a single product. */
const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  subCategory: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  taxRate: { select: { id: true, name: true, rate: true } },
  variants: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      costAdjustment: true,
      priceAdjustment: true,
    },
  },
  drugs: {
    select: { id: true, name: true, unitValue: true, unit: true },
  },
} satisfies Prisma.InventoryProductInclude;

/**
 * Map the EZHT add-product parity scalar fields (shared by create/update) to a
 * Prisma data object. `code`/`name`/references/defaults and variants are handled
 * by the callers; this covers the plain pass-through columns.
 */
function ezhtScalarData(dto: CreateProductDto | UpdateProductDto) {
  return {
    packSize: dto.packSize,
    salesMethod: dto.salesMethod,
    packCost: dto.packCost,
    packMrp: dto.packMrp,
    taxMethod: dto.taxMethod,
    taxMethodPurchase: dto.taxMethodPurchase,
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
  };
}

/**
 * Products — tenant-level catalogue (CLAUDE.md §4.7). References (category/
 * sub-category/unit/brand/tax) are validated via injected master-data services
 * (rule #3). Stock lives per-branch and is handled by ProductStockService.
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: SubCategoryService,
    private readonly unitService: UnitService,
    private readonly brandService: BrandService,
    private readonly taxRateService: TaxRateService,
    private readonly registry: TenantRegistryService,
  ) {}

  /** Create a product (+ optional inline variants), validating all references. */
  async create(tenantId: string, dto: CreateProductDto) {
    void this.registry.register(tenantId);
    await this.assertReferences(tenantId, dto);
    await this.assertCodeFree(tenantId, dto.code);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const product = await tx.inventoryProduct.create({
        data: {
          ...ezhtScalarData(dto),
          tenantId,
          code: dto.code,
          name: dto.name,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId,
          unitId: dto.unitId,
          brandId: dto.brandId,
          taxRateId: dto.taxRateId,
          type: dto.type ?? 'standard',
          cost: dto.cost ?? 0,
          price: dto.price ?? 0,
          alertQuantity: dto.alertQuantity ?? 0,
          isStockTracked: dto.isStockTracked ?? true,
          isTaxIncluded: dto.isTaxIncluded ?? false,
          isActive: dto.isActive ?? true,
          barcodeSymbology: dto.barcodeSymbology,
          imageUrl: dto.imageUrl,
          description: dto.description,
          genericName: dto.genericName,
          strength: dto.strength,
          potency: dto.potency,
          hsnCode: dto.hsnCode,
          isSerialized: dto.isSerialized ?? false,
          sourceMasterProductId: dto.sourceMasterProductId,
          variants: dto.variants?.length
            ? {
                create: dto.variants.map((v) => ({
                  tenantId,
                  name: v.name,
                  sku: v.sku,
                  costAdjustment: v.costAdjustment ?? 0,
                  priceAdjustment: v.priceAdjustment ?? 0,
                })),
              }
            : undefined,
        },
        include: PRODUCT_INCLUDE,
      });
      return product;
    });
  }

  /** Paginated, filterable product list with a computed total on-hand quantity. */
  async findAll(
    tenantId: string,
    query: ProductQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryProductWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    const [rows, total] = await this.prisma.$transaction(async (tx) => {
      const items = await tx.inventoryProduct.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          cost: true,
          price: true,
          alertQuantity: true,
          isActive: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          warehouseStocks: {
            where: { deletedAt: null },
            select: { quantity: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryProduct.count({ where });
      return [items, count] as const;
    });

    // Flatten per-branch stock into a single total for the list row.
    const data = rows.map(({ warehouseStocks, ...p }) => ({
      ...p,
      totalQuantity: warehouseStocks.reduce(
        (sum, s) => sum.add(s.quantity),
        new Prisma.Decimal(0),
      ),
    }));

    return { data, total, page, limit };
  }

  /** Fetch one product with its references + variants. */
  async findById(id: string, tenantId: string) {
    const product = await this.prisma.inventoryProduct.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new ProductNotFoundException(id);
    return product;
  }

  /** Fetch a product by its tenant-unique code (throws 404 if absent). */
  async findByCode(tenantId: string, code: string) {
    const product = await this.prisma.inventoryProduct.findFirst({
      where: { tenantId, code, deletedAt: null },
      select: { id: true, code: true },
    });
    if (!product) throw new ProductNotFoundException(code);
    return product;
  }

  /** Update a product; when `variants` is given it replaces the variant set. */
  async update(id: string, tenantId: string, dto: UpdateProductDto) {
    await this.findById(id, tenantId);
    await this.assertReferences(tenantId, dto);
    if (dto.code) await this.assertCodeFree(tenantId, dto.code, id);

    return this.prisma.withTenant(tenantId, async (tx) => {
      if (dto.variants) {
        await tx.inventoryProductVariant.deleteMany({
          where: { productId: id },
        });
      }
      return tx.inventoryProduct.update({
        where: { id },
        data: {
          ...ezhtScalarData(dto),
          code: dto.code,
          name: dto.name,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId,
          unitId: dto.unitId,
          brandId: dto.brandId,
          taxRateId: dto.taxRateId,
          type: dto.type,
          cost: dto.cost,
          price: dto.price,
          alertQuantity: dto.alertQuantity,
          isStockTracked: dto.isStockTracked,
          isTaxIncluded: dto.isTaxIncluded,
          isActive: dto.isActive,
          barcodeSymbology: dto.barcodeSymbology,
          imageUrl: dto.imageUrl,
          description: dto.description,
          genericName: dto.genericName,
          strength: dto.strength,
          potency: dto.potency,
          hsnCode: dto.hsnCode,
          isSerialized: dto.isSerialized,
          variants: dto.variants
            ? {
                create: dto.variants.map((v) => ({
                  tenantId,
                  name: v.name,
                  sku: v.sku,
                  costAdjustment: v.costAdjustment ?? 0,
                  priceAdjustment: v.priceAdjustment ?? 0,
                })),
              }
            : undefined,
        },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  /** Soft-delete a product. */
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProduct.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  /** Bulk update product price/cost (legacy Products::update_price). */
  async bulkUpdatePrice(tenantId: string, dto: BulkPriceUpdateDto) {
    let updated = 0;
    for (const item of dto.items) {
      const res = await this.prisma.inventoryProduct.updateMany({
        where: { id: item.id, tenantId, deletedAt: null },
        data: {
          ...(item.price != null ? { price: item.price } : {}),
          ...(item.cost != null ? { cost: item.cost } : {}),
        },
      });
      updated += res.count;
    }
    return { updated, total: dto.items.length };
  }

  /** Register serial numbers for a serialized product at the active branch. */
  async addSerials(
    id: string,
    tenantId: string,
    branchId: string | null,
    serials: string[],
  ) {
    await this.findById(id, tenantId);
    await this.prisma.inventoryProductSerial.createMany({
      data: serials.map((serialNo) => ({
        tenantId,
        branchId,
        productId: id,
        serialNo,
        status: 'IN_STOCK',
      })),
    });
    return this.listSerials(id, tenantId);
  }

  /** List a product's serial units. */
  async listSerials(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductSerial.findMany({
      where: { productId: id, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Find a product by one of its serial numbers (POS serial lookup). */
  async findBySerial(tenantId: string, serialNo: string) {
    const serial = await this.prisma.inventoryProductSerial.findFirst({
      where: { tenantId, serialNo, deletedAt: null },
      include: {
        product: { select: { id: true, name: true, code: true, price: true } },
      },
    });
    return serial;
  }

  /** Set a product's rack/bin location at a branch (legacy set_rack). */
  async setRack(
    id: string,
    tenantId: string,
    branchId: string | null,
    rack: string | undefined,
  ) {
    if (!branchId) throw new BranchRequiredException();
    await this.findById(id, tenantId);
    return this.prisma.inventoryWarehouseProduct.upsert({
      where: { productId_branchId: { productId: id, branchId } },
      update: { rack: rack ?? null },
      create: {
        tenantId,
        branchId,
        productId: id,
        quantity: 0,
        avgCost: 0,
        rack: rack ?? null,
      },
      select: { id: true, branchId: true, rack: true },
    });
  }

  /**
   * Deep-copy a product (scalars + variants + drugs) into a new one. The copy's
   * name gets a " (copy)" suffix and its code is suffixed to stay unique; stock,
   * serials and adjustments are NOT copied.
   */
  async duplicate(id: string, tenantId: string) {
    const source = await this.prisma.inventoryProduct.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null } },
        drugs: true,
      },
    });
    if (!source) throw new ProductNotFoundException(id);

    // Derive a free code: "<code>-copy", then "-copy2", … until unique.
    let code = `${source.code}-copy`;
    for (let n = 2; await this.codeTaken(tenantId, code); n++) {
      code = `${source.code}-copy${n}`;
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.inventoryProduct.create({
        data: {
          tenantId,
          code,
          name: `${source.name} (copy)`,
          categoryId: source.categoryId,
          subCategoryId: source.subCategoryId,
          unitId: source.unitId,
          brandId: source.brandId,
          taxRateId: source.taxRateId,
          type: source.type,
          cost: source.cost,
          price: source.price,
          alertQuantity: source.alertQuantity,
          isStockTracked: source.isStockTracked,
          isTaxIncluded: source.isTaxIncluded,
          isActive: source.isActive,
          barcodeSymbology: source.barcodeSymbology,
          imageUrl: source.imageUrl,
          galleryImageUrls: source.galleryImageUrls,
          description: source.description,
          genericName: source.genericName,
          strength: source.strength,
          potency: source.potency,
          hsnCode: source.hsnCode,
          isSerialized: source.isSerialized,
          packSize: source.packSize,
          salesMethod: source.salesMethod,
          packCost: source.packCost,
          packMrp: source.packMrp,
          taxMethod: source.taxMethod,
          taxMethodPurchase: source.taxMethodPurchase,
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
          variants: source.variants.length
            ? {
                create: source.variants.map((v) => ({
                  tenantId,
                  name: v.name,
                  sku: v.sku,
                  costAdjustment: v.costAdjustment,
                  priceAdjustment: v.priceAdjustment,
                })),
              }
            : undefined,
          drugs: source.drugs.length
            ? {
                create: source.drugs.map((d) => ({
                  tenantId,
                  name: d.name,
                  unitValue: d.unitValue,
                  unit: d.unit,
                })),
              }
            : undefined,
        },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  /** Whether a product code is already used by the tenant (active rows). */
  private async codeTaken(tenantId: string, code: string): Promise<boolean> {
    const row = await this.prisma.inventoryProduct.findFirst({
      where: { tenantId, code, deletedAt: null },
      select: { id: true },
    });
    return !!row;
  }

  // ── Drug composition (EZHT "Drugs" modal) ───────────────────────────────────
  /** List a product's drug-composition rows. */
  async listDrugs(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductDrug.findMany({
      where: { productId: id, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Add a drug-composition row to a product. */
  async addDrug(
    id: string,
    tenantId: string,
    data: { name: string; unitValue?: string; unit?: string },
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductDrug.create({
      data: {
        tenantId,
        productId: id,
        name: data.name,
        unitValue: data.unitValue,
        unit: data.unit,
      },
    });
  }

  /** Delete a single drug-composition row from a product. */
  async removeDrug(id: string, tenantId: string, drugId: string) {
    await this.findById(id, tenantId);
    const row = await this.prisma.inventoryProductDrug.findFirst({
      where: { id: drugId, productId: id, tenantId },
      select: { id: true },
    });
    if (!row) throw new ProductNotFoundException(drugId);
    await this.prisma.inventoryProductDrug.delete({ where: { id: drugId } });
    return { id: drugId };
  }

  /** Validate every supplied reference belongs to the tenant (throws if not). */
  private async assertReferences(
    tenantId: string,
    dto: CreateProductDto | UpdateProductDto,
  ): Promise<void> {
    if (dto.categoryId)
      await this.categoryService.findById(dto.categoryId, tenantId);
    if (dto.subCategoryId)
      await this.subCategoryService.findById(dto.subCategoryId, tenantId);
    if (dto.unitId) await this.unitService.findById(dto.unitId, tenantId);
    if (dto.brandId) await this.brandService.findById(dto.brandId, tenantId);
    if (dto.taxRateId)
      await this.taxRateService.findById(dto.taxRateId, tenantId);
  }

  private async assertCodeFree(
    tenantId: string,
    code: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.inventoryProduct.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ProductCodeConflictException(code);
  }
}
