import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../sub-category/sub-category.service';
import { UnitService } from '../unit/unit.service';
import { BrandService } from '../brand/brand.service';
import { ManufacturerService } from '../manufacturer/manufacturer.service';
import { SupplierService } from '../supplier/supplier.service';
import { TaxRateService } from '../tax-rate/tax-rate.service';
import { TenantRegistryService } from '../alerts/tenant-registry.service';
import {
  CreateProductDto,
  ProductSupplierInputDto,
  ProductVariantInputDto,
} from './dto/create-product.dto';
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
  manufacturer: { select: { id: true, name: true } },
  taxRate: { select: { id: true, name: true, rate: true } },
  variants: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      costAdjustment: true,
      priceAdjustment: true,
      warehouseStocks: {
        where: { deletedAt: null },
        select: { id: true, branchId: true, quantity: true, cost: true },
      },
    },
  },
  suppliers: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      supplierId: true,
      partNumber: true,
      price: true,
      sortOrder: true,
      supplier: { select: { id: true, name: true } },
    },
  },
  drugs: {
    where: { deletedAt: null },
    select: { id: true, drugId: true, name: true, unitValue: true, unit: true },
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
 * Build the nested variant create payload. A variant may carry an initial
 * warehouse (branch) + quantity + cost (EZHT "attributes" table parity), which
 * is written as an InventoryVariantWarehouseProduct row.
 */
function buildVariantCreate(
  tenantId: string,
  variants: ProductVariantInputDto[] | undefined,
):
  | Prisma.InventoryProductVariantCreateNestedManyWithoutProductInput
  | undefined {
  if (!variants?.length) return undefined;
  return {
    create: variants.map((v) => ({
      tenantId,
      name: v.name,
      sku: v.sku,
      costAdjustment: v.costAdjustment ?? 0,
      priceAdjustment: v.priceAdjustment ?? 0,
      warehouseStocks:
        v.branchId && (v.quantity != null || v.cost != null)
          ? {
              create: [
                {
                  tenantId,
                  branchId: v.branchId,
                  quantity: v.quantity ?? 0,
                  cost: v.cost,
                },
              ],
            }
          : undefined,
    })),
  };
}

/** Build the nested per-product supplier create payload (capped at 5, ordered). */
function buildSupplierCreate(
  tenantId: string,
  suppliers: ProductSupplierInputDto[] | undefined,
):
  | Prisma.InventoryProductSupplierCreateNestedManyWithoutProductInput
  | undefined {
  if (!suppliers?.length) return undefined;
  return {
    create: suppliers.slice(0, 5).map((s, i) => ({
      tenantId,
      supplierId: s.supplierId,
      partNumber: s.partNumber,
      price: s.price,
      sortOrder: i,
    })),
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
    private readonly manufacturerService: ManufacturerService,
    private readonly supplierService: SupplierService,
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
          manufacturerId: dto.manufacturerId,
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
          variants: buildVariantCreate(tenantId, dto.variants),
          suppliers: buildSupplierCreate(tenantId, dto.suppliers),
          // No base opening warehouse stock on create — products are tenant-level and
          // branch stock is seeded lazily via quantity adjustments (Adjust Quantities).
          // Variant opening stock (below) is the one exception, mirroring EZHT.
        },
        include: PRODUCT_INCLUDE,
      });

      // Variant opening stock (EZHT "attributes" with a warehouse qty) seeds BOTH the
      // per-variant ledger (created above) AND the aggregate product warehouse row, so
      // the product total stays in lock-step with its variant breakdown — exactly as a
      // variant sale/purchase/adjustment later moves both.
      await this.seedVariantBaseStock(tx, tenantId, product.id, dto.variants);

      return product;
    });
  }

  /**
   * Increment the aggregate (branch, product) warehouse stock by each variant's
   * opening quantity, so the product total reflects its variants from creation.
   * Quantities are summed per branch. No-op when no variant carries opening stock.
   */
  private async seedVariantBaseStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
    variants: ProductVariantInputDto[] | undefined,
  ): Promise<void> {
    if (!variants?.length) return;
    const perBranch = new Map<string, { qty: Prisma.Decimal; cost?: number }>();
    for (const v of variants) {
      if (!v.branchId || v.quantity == null) continue;
      const cur = perBranch.get(v.branchId) ?? { qty: new Prisma.Decimal(0) };
      cur.qty = cur.qty.add(new Prisma.Decimal(v.quantity));
      if (v.cost != null) cur.cost = v.cost;
      perBranch.set(v.branchId, cur);
    }
    for (const [branchId, { qty, cost }] of perBranch) {
      if (qty.lte(0)) continue;
      await tx.inventoryWarehouseProduct.upsert({
        where: { productId_branchId: { productId, branchId } },
        update: { quantity: { increment: qty } },
        create: {
          tenantId,
          branchId,
          productId,
          quantity: qty,
          avgCost:
            cost != null ? new Prisma.Decimal(cost) : new Prisma.Decimal(0),
        },
      });
    }
  }

  /**
   * Paginated, filterable product list. Products are tenant-level (every product
   * is listed for the tenant), but quantity/pricing/batch values are scoped to the
   * caller's **active branch** (`branchId`): we read only that branch's warehouse
   * row and fall back to the product's tenant-level defaults when the branch has no
   * stock yet. Cross-branch quantities are never summed. A null `branchId` (a
   * tenant-level profile with no active branch) yields zero/empty branch inventory.
   */
  async findAll(
    tenantId: string,
    branchId: string | null,
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
          packCost: true,
          packMrp: true,
          packSize: true,
          alertQuantity: true,
          imageUrl: true,
          isActive: true,
          // Product default tax (EZHT purchase/sale auto-fill: the line's tax rate +
          // inclusive/exclusive method come from the product, not a per-row picker).
          taxRateId: true,
          taxMethodPurchase: true,
          taxRate: { select: { rate: true } },
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          // Only the active branch's stock row (never a cross-branch set). A null
          // branch matches nothing, leaving the product with empty branch inventory.
          warehouseStocks: {
            where: { deletedAt: null, branchId: branchId ?? '__none__' },
            select: {
              quantity: true,
              rack: true,
              avgCost: true,
              unitMrp: true,
              packMrp: true,
              packSize: true,
              packQuantity: true,
              batchNo: true,
              expiryDate: true,
            },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const count = await tx.inventoryProduct.count({ where });
      return [items, count] as const;
    });

    // EZHT parity: the four money columns (Unit Cost, Unit MRP, Product Cost,
    // Product MRP) always show the product-level values (`cost`/`price`/`packCost`/
    // `packMrp`) — EZHT's listing joins the warehouse only for quantity/rack, never for
    // pricing. Quantity/rack/batch remain scoped to the caller's active branch.
    const data = rows.map(({ warehouseStocks, taxRate, ...p }) => {
      const stock = warehouseStocks[0] ?? null;
      return {
        ...p,
        quantity: stock?.quantity ?? new Prisma.Decimal(0),
        rack: stock?.rack ?? null,
        cost: p.cost,
        price: p.price,
        packMrp: p.packMrp,
        // Prefer the product-level pack size (EZHT auto-fill source); fall back to
        // the active-branch stock row when the product has none.
        packSize: p.packSize ?? stock?.packSize ?? null,
        packQuantity: stock?.packQuantity ?? null,
        // Default tax rate (%) for auto-fill on line add; 0 when the product has none.
        taxRatePercent: taxRate ? taxRate.rate : new Prisma.Decimal(0),
        batchNo: stock?.batchNo ?? null,
        expiryDate: stock?.expiryDate ?? null,
      };
    });

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
      // Variants are replaced wholesale when supplied; their per-warehouse stock
      // rows cascade-delete with them.
      if (dto.variants) {
        await tx.inventoryProductVariant.deleteMany({
          where: { productId: id },
        });
      }
      // Suppliers are likewise replaced wholesale when supplied.
      if (dto.suppliers) {
        await tx.inventoryProductSupplier.deleteMany({
          where: { productId: id },
        });
      }
      // Initial/edited per-branch stock is applied as an upsert so existing
      // stock + average cost are preserved for branches not in the payload.
      if (dto.warehouseStocks?.length) {
        for (const w of dto.warehouseStocks) {
          await tx.inventoryWarehouseProduct.upsert({
            where: {
              productId_branchId: { productId: id, branchId: w.branchId },
            },
            update: {
              quantity: w.quantity ?? 0,
              ...(w.cost != null ? { avgCost: w.cost } : {}),
              ...(w.rack !== undefined ? { rack: w.rack } : {}),
            },
            create: {
              tenantId,
              branchId: w.branchId,
              productId: id,
              quantity: w.quantity ?? 0,
              avgCost: w.cost ?? 0,
              rack: w.rack,
            },
          });
        }
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
          manufacturerId: dto.manufacturerId,
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
          variants: buildVariantCreate(tenantId, dto.variants),
          suppliers: buildSupplierCreate(tenantId, dto.suppliers),
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
          manufacturerId: source.manufacturerId,
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
                  drugId: d.drugId,
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
  /** List a product's active drug-composition rows. */
  async listDrugs(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductDrug.findMany({
      where: { productId: id, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add a drug-composition row to a product (EZHT `add_drug`). When `drugId` is a
   * master drug, its name is snapshotted; otherwise a free-text `name` is used. If
   * a (soft-deleted or active) row already links the same master drug, it is
   * re-activated/updated instead of duplicated (EZHT `activateProductRelation`).
   */
  async addDrug(
    id: string,
    tenantId: string,
    data: { drugId?: string; name?: string; unitValue?: string; unit?: string },
  ) {
    await this.findById(id, tenantId);

    // Resolve the drug name — from the master when a drugId is supplied.
    let name = data.name?.trim();
    if (data.drugId) {
      const master = await this.prisma.inventoryDrug.findFirst({
        where: { id: data.drugId, tenantId, deletedAt: null },
        select: { name: true },
      });
      if (!master) throw new ProductNotFoundException(data.drugId);
      name = master.name;
    }
    if (!name) throw new ProductNotFoundException('drug');

    // Re-activate parity: reuse an existing link to the same master drug.
    if (data.drugId) {
      const existing = await this.prisma.inventoryProductDrug.findFirst({
        where: { productId: id, tenantId, drugId: data.drugId },
        select: { id: true },
      });
      if (existing) {
        return this.prisma.inventoryProductDrug.update({
          where: { id: existing.id },
          data: {
            name,
            unitValue: data.unitValue,
            unit: data.unit,
            deletedAt: null,
          },
        });
      }
    }

    return this.prisma.inventoryProductDrug.create({
      data: {
        tenantId,
        productId: id,
        drugId: data.drugId,
        name,
        unitValue: data.unitValue,
        unit: data.unit,
      },
    });
  }

  /** Soft-delete a single drug-composition row from a product. */
  async removeDrug(id: string, tenantId: string, drugId: string) {
    await this.findById(id, tenantId);
    const row = await this.prisma.inventoryProductDrug.findFirst({
      where: { id: drugId, productId: id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new ProductNotFoundException(drugId);
    await this.prisma.inventoryProductDrug.update({
      where: { id: drugId },
      data: { deletedAt: new Date() },
    });
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
    if (dto.manufacturerId)
      await this.manufacturerService.findById(dto.manufacturerId, tenantId);
    if (dto.taxRateId)
      await this.taxRateService.findById(dto.taxRateId, tenantId);
    if (dto.suppliers?.length) {
      for (const s of dto.suppliers) {
        await this.supplierService.findById(s.supplierId, tenantId);
      }
    }
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
