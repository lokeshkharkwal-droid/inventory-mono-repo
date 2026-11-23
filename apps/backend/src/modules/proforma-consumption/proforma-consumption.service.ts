import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductStockService } from '../product/product-stock.service';
import {
  computeOrderTotals,
  derivePaymentStatus,
} from '../../common/utils/order-totals.util';
import {
  ConsumeConsumptionDto,
  LoadAdjustmentDto,
  SaveAdjustmentDto,
  ValidateConsumptionDto,
} from './dto/consumption.dto';
import {
  ConsumptionScopeMismatchException,
  InsufficientConsumptionStockException,
} from './exceptions/consumption.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Proforma-item quantity methods (mirrors `InventoryProformaItem.quantityMethod`):
 * - SINGLE: deduct `configuredQty × (number of the order's tests mapped to this
 *   proforma)` — the product is consumed once per mapped test.
 * - COMBINED: deduct `configuredQty` once, no matter how many tests map.
 */
const QUANTITY_METHOD = { SINGLE: 1, COMBINED: 2 } as const;

/** A product line aggregated across every matched proforma (summed quantity). */
interface AggregatedProduct {
  productId: string;
  productName: string;
  productCode: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
}

/**
 * One deduction-ledger line: a product's required quantity at a given granularity.
 * For `scope = ORDER` the `labTestSourceId` is the `''` sentinel; for `scope = TEST`
 * it is the master lab test the line belongs to.
 */
interface LedgerLine {
  scope: 'ORDER' | 'TEST';
  labTestSourceId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
}

/** A matched proforma (lab-test mapped AND branch-enabled) + its product lines. */
interface MatchedProforma {
  proformaId: string;
  proformaName: string;
  reference: string;
  products: AggregatedProduct[];
}

/** Per-product availability, for validation / the registration tooltip. */
export interface ProductAvailability {
  productId: string;
  productName: string;
  productCode: string | null;
  requiredQty: number;
  availableQty: number;
  alertQty: number;
  sufficient: boolean;
}

/**
 * Proforma-driven inventory consumption — the inbound integration surface the
 * kalnostics-new order flow calls. A lab test pulls inventory only when a proforma
 * is mapped to BOTH that master lab test AND the order's active branch
 * (requirement #13). Resolving, validating and consuming all share one matcher so
 * the tooltip, the pre-order check and the deduction can never disagree.
 */
@Injectable()
export class ProformaConsumptionService {
  private readonly logger = new Logger(ProformaConsumptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: ProductStockService,
  ) {}

  /**
   * Find the proformas that apply to `labTestSourceIds` at `branchId`: mapped to
   * at least one of the lab tests AND enabled for the branch. Returns each with
   * its product lines, with the per-line **quantity method** already applied:
   * a SINGLE line is multiplied by how many of the order's tests map to that
   * proforma; a COMBINED line is taken once. (A product recurring within a
   * proforma is summed after that multiplication.)
   *
   * The mapped-test count is the number of **distinct** `labTestSourceIds` mapped
   * to the proforma — kalnostics sends a deduped list, so a test ordered twice is
   * one mapped test.
   */
  private async resolveMatchedProformas(
    tenantId: string,
    branchId: string,
    labTestSourceIds: string[],
  ): Promise<MatchedProforma[]> {
    if (labTestSourceIds.length === 0) return [];

    // 1. Proformas mapped to any of these master lab tests. Keep `entityId` so we
    //    can count, per proforma, how many of the order's tests map to it (the
    //    SINGLE multiplier).
    const labRelations = await this.prisma.inventoryProformaRelation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        entityType: 'lab_test',
        entityId: { in: labTestSourceIds },
      },
      select: { proformaId: true, entityId: true },
    });
    const candidateIds = [...new Set(labRelations.map((r) => r.proformaId))];
    if (candidateIds.length === 0) return [];

    // Distinct mapped tests per proforma (guards against duplicate relation rows).
    const testsByProforma = new Map<string, Set<string>>();
    for (const r of labRelations) {
      const set = testsByProforma.get(r.proformaId) ?? new Set<string>();
      set.add(r.entityId);
      testsByProforma.set(r.proformaId, set);
    }

    // 2. Of those, keep only the ones also enabled for the active branch.
    const branchRelations =
      await this.prisma.inventoryProformaRelation.findMany({
        where: {
          tenantId,
          deletedAt: null,
          entityType: 'branch',
          entityId: branchId,
          proformaId: { in: candidateIds },
        },
        select: { proformaId: true },
      });
    const matchedIds = [...new Set(branchRelations.map((r) => r.proformaId))];
    if (matchedIds.length === 0) return [];

    // 3. Load the matched proformas + their product lines.
    const proformas = await this.prisma.inventoryProforma.findMany({
      where: { id: { in: matchedIds }, tenantId, deletedAt: null },
      include: { items: true },
    });

    return proformas.map((p) => {
      // How many of the order's tests map to this proforma (SINGLE multiplier).
      const mappedTestCount = testsByProforma.get(p.id)?.size ?? 1;

      const byProduct = new Map<string, AggregatedProduct>();
      for (const it of p.items) {
        const multiplier =
          it.quantityMethod === QUANTITY_METHOD.COMBINED ? 1 : mappedTestCount;
        const effectiveQty = D(it.quantity).mul(multiplier);
        const existing = byProduct.get(it.productId);
        if (existing) {
          existing.quantity = existing.quantity.add(effectiveQty);
        } else {
          byProduct.set(it.productId, {
            productId: it.productId,
            productName: it.productName,
            productCode: it.productCode,
            quantity: effectiveQty,
            unitPrice: D(it.unitPrice),
            taxRate: D(it.taxRate),
          });
        }
      }
      return {
        proformaId: p.id,
        proformaName: p.name ?? p.reference,
        reference: p.reference,
        products: [...byProduct.values()],
      };
    });
  }

  /** Sum required quantity per product across all matched proformas. */
  private aggregateProducts(matched: MatchedProforma[]): AggregatedProduct[] {
    const byProduct = new Map<string, AggregatedProduct>();
    for (const m of matched) {
      for (const p of m.products) {
        const existing = byProduct.get(p.productId);
        if (existing) existing.quantity = existing.quantity.add(p.quantity);
        else byProduct.set(p.productId, { ...p, quantity: D(p.quantity) });
      }
    }
    return [...byProduct.values()];
  }

  /**
   * Resolve the deduction-ledger lines for an order at the requested granularity.
   * - `ORDER`: one set of product lines aggregated across all the order's tests
   *   (SINGLE × mapped-test-count, COMBINED × 1), tagged with the `''` sentinel.
   * - `TEST`: one set of product lines PER lab test, each resolved from that test
   *   alone — so SINGLE and COMBINED both deduct the configured quantity once per
   *   test. The planned total therefore differs from ORDER for COMBINED products,
   *   by design (confirmed product decision).
   */
  private async computeLedgerLines(
    tenantId: string,
    branchId: string,
    labTestSourceIds: string[],
    scope: 'ORDER' | 'TEST',
  ): Promise<LedgerLine[]> {
    if (scope === 'TEST') {
      const distinct = [...new Set(labTestSourceIds)];
      const perTest = await Promise.all(
        distinct.map(async (testId) => {
          const matched = await this.resolveMatchedProformas(
            tenantId,
            branchId,
            [testId],
          );
          return this.aggregateProducts(matched).map((p): LedgerLine => ({
            scope: 'TEST',
            labTestSourceId: testId,
            productId: p.productId,
            productName: p.productName,
            productCode: p.productCode,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            taxRate: p.taxRate,
          }));
        }),
      );
      return perTest.flat();
    }

    const matched = await this.resolveMatchedProformas(
      tenantId,
      branchId,
      labTestSourceIds,
    );
    return this.aggregateProducts(matched).map((p): LedgerLine => ({
      scope: 'ORDER',
      labTestSourceId: '',
      productId: p.productId,
      productName: p.productName,
      productCode: p.productCode,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      taxRate: p.taxRate,
    }));
  }

  /** Sum quantity per product across ledger lines (the stock/sale aggregate). */
  private aggregateLedger(lines: LedgerLine[]): AggregatedProduct[] {
    const byProduct = new Map<string, AggregatedProduct>();
    for (const l of lines) {
      const existing = byProduct.get(l.productId);
      if (existing) existing.quantity = existing.quantity.add(l.quantity);
      else
        byProduct.set(l.productId, {
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          quantity: D(l.quantity),
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
        });
    }
    return [...byProduct.values()];
  }

  /** Current on-hand quantity per product at a branch (0 when no row exists). */
  private async stockByProduct(
    tenantId: string,
    branchId: string,
    productIds: string[],
  ): Promise<Map<string, Prisma.Decimal>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.inventoryWarehouseProduct.findMany({
      where: {
        tenantId,
        branchId,
        productId: { in: productIds },
        deletedAt: null,
      },
      select: { productId: true, quantity: true },
    });
    return new Map(rows.map((r) => [r.productId, D(r.quantity)]));
  }

  /** Alert (reorder) quantity per product. */
  private async alertByProduct(
    tenantId: string,
    productIds: string[],
  ): Promise<Map<string, Prisma.Decimal>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.inventoryProduct.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, alertQuantity: true },
    });
    return new Map(rows.map((r) => [r.id, D(r.alertQuantity)]));
  }

  /** Compose per-product availability for a required-quantity map at a branch. */
  private async buildAvailability(
    tenantId: string,
    branchId: string,
    required: AggregatedProduct[],
  ): Promise<ProductAvailability[]> {
    const ids = required.map((p) => p.productId);
    const [stock, alerts] = await Promise.all([
      this.stockByProduct(tenantId, branchId, ids),
      this.alertByProduct(tenantId, ids),
    ]);
    return required.map((p) => {
      const available = stock.get(p.productId) ?? D(0);
      const alert = alerts.get(p.productId) ?? D(0);
      return {
        productId: p.productId,
        productName: p.productName,
        productCode: p.productCode,
        requiredQty: p.quantity.toNumber(),
        availableQty: available.toNumber(),
        alertQty: alert.toNumber(),
        sufficient: available.gte(p.quantity),
      };
    });
  }

  /**
   * Validate stock for an order's lab tests without mutating anything. Safe to
   * call pre-order. `hasMapping=false` means no proforma applies — the order can
   * proceed with no inventory effect.
   */
  async validate(tenantId: string, dto: ValidateConsumptionDto) {
    const matched = await this.resolveMatchedProformas(
      tenantId,
      dto.branchId,
      dto.labTestSourceIds,
    );
    const required = this.aggregateProducts(matched);
    const products = await this.buildAvailability(
      tenantId,
      dto.branchId,
      required,
    );
    const shortages = products
      .filter((p) => !p.sufficient)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        requiredQty: p.requiredQty,
        availableQty: p.availableQty,
      }));
    return {
      hasMapping: matched.length > 0,
      ok: shortages.length === 0,
      proformas: matched.map((m) => ({
        proformaId: m.proformaId,
        proformaName: m.proformaName,
        reference: m.reference,
      })),
      products,
      shortages,
    };
  }

  /**
   * Proforma + product info for a SINGLE lab test at a branch — powers the
   * registration tooltip. Returns `mapped=false` when nothing applies (so the
   * frontend shows no icon). Read-only; reflects live stock + alert levels.
   */
  async info(tenantId: string, branchId: string, labTestSourceId: string) {
    const matched = await this.resolveMatchedProformas(tenantId, branchId, [
      labTestSourceId,
    ]);
    if (matched.length === 0) {
      return { mapped: false, proformas: [] };
    }
    const proformas = await Promise.all(
      matched.map(async (m) => ({
        proformaId: m.proformaId,
        proformaName: m.proformaName,
        reference: m.reference,
        products: await this.buildAvailability(tenantId, branchId, m.products),
      })),
    );
    return { mapped: true, proformas };
  }

  /**
   * Deduct the proforma-mapped products for a confirmed order and record the
   * linked sale — all in one transaction. Idempotent: a second call for the same
   * `kalnosticsOrderId` returns the first result and deducts nothing (the unique
   * ledger row is the guard). Returns `{ consumed:false, hasMapping:false }` when
   * no proforma applies.
   *
   * @throws InsufficientConsumptionStockException when stock is short (nothing is
   *   deducted and no sale is created — the whole transaction rolls back).
   */
  async consume(
    tenantId: string,
    dto: ConsumeConsumptionDto,
    actorId?: string,
  ) {
    // Fast idempotency check (also enforced by the unique constraint below).
    const prior = await this.prisma.inventoryOrderConsumption.findUnique({
      where: { kalnosticsOrderId: dto.kalnosticsOrderId },
    });
    if (prior) {
      return {
        consumed: true,
        alreadyConsumed: true,
        hasMapping: true,
        saleId: prior.saleId,
      };
    }

    const scope: 'ORDER' | 'TEST' = dto.scope ?? 'ORDER';
    const ledgerLines = await this.computeLedgerLines(
      tenantId,
      dto.branchId,
      dto.labTestSourceIds,
      scope,
    );
    const required = this.aggregateLedger(ledgerLines);
    if (required.length === 0) {
      return {
        consumed: false,
        alreadyConsumed: false,
        hasMapping: false,
        saleId: null,
      };
    }

    // Pre-flight stock check (defence in depth; applyDelta re-checks per line).
    const availability = await this.buildAvailability(
      tenantId,
      dto.branchId,
      required,
    );
    const shortages = availability.filter((p) => !p.sufficient);
    if (shortages.length > 0) {
      throw new InsufficientConsumptionStockException(
        shortages.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          requiredQty: p.requiredQty,
          availableQty: p.availableQty,
        })),
      );
    }

    const totals = computeOrderTotals({
      lines: required.map((p) => ({
        quantity: p.quantity.toNumber(),
        unitPrice: p.unitPrice.toNumber(),
        taxRatePercent: p.taxRate.toNumber(),
        taxInclusive: false,
      })),
      orderTaxPercent: 0,
      shipping: 0,
    });
    const date = dto.date ? new Date(dto.date) : new Date();
    const reference = dto.orderCode ?? dto.kalnosticsOrderId;

    return this.prisma.withTenant(tenantId, async (tx) => {
      // Re-check idempotency inside the tx; the unique constraint is the hard
      // guard against a concurrent double-consume.
      const dup = await tx.inventoryOrderConsumption.findUnique({
        where: { kalnosticsOrderId: dto.kalnosticsOrderId },
      });
      if (dup) {
        return {
          consumed: true,
          alreadyConsumed: true,
          hasMapping: true,
          saleId: dup.saleId,
        };
      }

      const customerId = await this.resolveCustomer(
        tx,
        tenantId,
        dto.patientId,
        dto.patientName,
      );

      // The consumption sale: a COMPLETED, fully-settled internal issue (no
      // receivable) referencing the kalnostics order.
      const sale = await tx.inventorySale.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          customerId,
          reference,
          date,
          status: 'COMPLETED',
          subtotal: totals.subtotal,
          productDiscount: totals.productDiscount,
          orderTax: totals.orderTax,
          totalTax: totals.totalTax,
          shipping: totals.shipping,
          roundoff: totals.roundoff,
          grandTotal: totals.grandTotal,
          totalItems: Math.round(totals.totalItems.toNumber()),
          paid: totals.grandTotal,
          paymentStatus: derivePaymentStatus(
            totals.grandTotal,
            totals.grandTotal,
          ),
          note: `Auto-generated from kalnostics order ${reference}`,
          createdBy: actorId,
          items: {
            create: required.map((p, i) => {
              const c = totals.lines[i]!;
              return {
                tenantId,
                productId: p.productId,
                productName: p.productName,
                productCode: p.productCode,
                quantity: p.quantity,
                price: p.unitPrice,
                realUnitPrice: c.realUnitPrice,
                netUnitPrice: c.netUnitPrice,
                taxRate: p.taxRate,
                taxAmount: c.taxAmount,
                subtotal: c.subtotal,
              };
            }),
          },
        },
        select: { id: true },
      });

      // Deduct stock (outbound) for each product — throws if a line goes negative.
      for (const p of required) {
        await this.stockService.applyDelta(tx, {
          tenantId,
          branchId: dto.branchId,
          productId: p.productId,
          delta: p.quantity.negated(),
        });
      }

      const consumption = await tx.inventoryOrderConsumption.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          kalnosticsOrderId: dto.kalnosticsOrderId,
          orderCode: dto.orderCode,
          saleId: sale.id,
          status: 'CONSUMED',
          scope,
          isAutoDeducted: true,
        },
        select: { id: true },
      });

      // Record the authoritative per-scope deduction state so later manual
      // adjustments can diff against it (currentQty = plannedQty on auto-deduct).
      await tx.inventoryConsumptionLine.createMany({
        data: ledgerLines.map((l) => ({
          tenantId,
          branchId: dto.branchId,
          scope: l.scope,
          kalnosticsOrderId: dto.kalnosticsOrderId,
          labTestSourceId: l.labTestSourceId,
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          plannedQty: l.quantity,
          currentQty: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          consumptionId: consumption.id,
        })),
      });

      this.logger.log(
        `Consumed ${required.length} product(s) for order ${reference} → sale ${sale.id}`,
      );
      return {
        consumed: true,
        alreadyConsumed: false,
        hasMapping: true,
        saleId: sale.id,
      };
    });
  }

  /**
   * The scope a manual adjustment runs at. Once an order has a consumption row its
   * scope is fixed; a request at a different scope is rejected to prevent a per-test
   * adjustment double-deducting on top of an order-level one (or vice-versa) after a
   * mode switch. With no row yet (auto-deduction was off) the requested scope wins.
   */
  private effectiveScope(
    recorded: string | undefined,
    requested: 'ORDER' | 'TEST',
  ): 'ORDER' | 'TEST' {
    if (recorded && recorded !== requested) {
      throw new ConsumptionScopeMismatchException(recorded, requested);
    }
    return requested;
  }

  /** The proforma-planned ledger lines for a load/save target (order or one test). */
  private async plannedLinesFor(
    tenantId: string,
    dto: LoadAdjustmentDto,
    scope: 'ORDER' | 'TEST',
  ): Promise<LedgerLine[]> {
    if (scope === 'TEST') {
      if (!dto.labTestSourceId) return [];
      return this.computeLedgerLines(
        tenantId,
        dto.branchId,
        [dto.labTestSourceId],
        'TEST',
      );
    }
    return this.computeLedgerLines(
      tenantId,
      dto.branchId,
      dto.labTestSourceIds,
      'ORDER',
    );
  }

  /**
   * Load the manual-adjustment view for a kalnostics order at the given scope.
   * Per product: the proforma-planned quantity, the quantity currently deducted
   * (0 when nothing is deducted yet), live branch stock, and a suggested final
   * quantity (the previously-deducted value if any, else the planned). Read-only.
   *
   * @throws ConsumptionScopeMismatchException if the order was recorded at a
   *   different granularity than requested.
   */
  async loadAdjustment(tenantId: string, dto: LoadAdjustmentDto) {
    const consumption = await this.prisma.inventoryOrderConsumption.findUnique({
      where: { kalnosticsOrderId: dto.kalnosticsOrderId },
      select: { scope: true, isAutoDeducted: true, status: true },
    });
    const scope = this.effectiveScope(consumption?.scope, dto.scope);
    const labTestKey = scope === 'TEST' ? (dto.labTestSourceId ?? '') : '';

    const planned = await this.plannedLinesFor(tenantId, dto, scope);
    const plannedByProduct = new Map(planned.map((l) => [l.productId, l]));

    const existing = await this.prisma.inventoryConsumptionLine.findMany({
      where: {
        tenantId,
        kalnosticsOrderId: dto.kalnosticsOrderId,
        scope,
        labTestSourceId: labTestKey,
        deletedAt: null,
      },
    });
    const existingByProduct = new Map(existing.map((l) => [l.productId, l]));

    const productIds = [
      ...new Set([...plannedByProduct.keys(), ...existingByProduct.keys()]),
    ];
    const stock = await this.stockByProduct(tenantId, dto.branchId, productIds);

    const products = productIds.map((productId) => {
      const p = plannedByProduct.get(productId);
      const line = existingByProduct.get(productId);
      const prev = line ? D(line.currentQty) : D(0);
      const plannedQty = p ? p.quantity : line ? D(line.plannedQty) : D(0);
      return {
        productId,
        productName: p?.productName ?? line?.productName ?? '',
        productCode: p?.productCode ?? line?.productCode ?? null,
        plannedQty: plannedQty.toNumber(),
        previouslyDeductedQty: prev.toNumber(),
        currentStock: (stock.get(productId) ?? D(0)).toNumber(),
        finalQtySuggestion: (line ? prev : plannedQty).toNumber(),
      };
    });

    return {
      scope,
      kalnosticsOrderId: dto.kalnosticsOrderId,
      labTestSourceId: scope === 'TEST' ? labTestKey : null,
      isAutoDeducted: consumption?.isAutoDeducted ?? false,
      status: consumption?.status ?? 'PENDING_MANUAL',
      totalPlannedQty: products.reduce((s, p) => s + p.plannedQty, 0),
      products,
    };
  }

  /**
   * Apply a manual inventory adjustment: set the final deducted quantity per
   * product for an order (ORDER scope) or one lab test (TEST scope), applying only
   * the DIFFERENCE against what is already deducted — so stock is never
   * double-deducted and re-saving the same values is a no-op. When auto-deduction
   * was off and this is the first save, it performs the initial deduction and
   * creates the linked sale.
   *
   * @throws ConsumptionScopeMismatchException on a scope/mode mismatch.
   * @throws InsufficientConsumptionStockException if a net additional deduction
   *   exceeds available stock (nothing is applied — the transaction rolls back).
   */
  async saveAdjustment(
    tenantId: string,
    dto: SaveAdjustmentDto,
    actorId?: string,
  ) {
    if (dto.scope === 'TEST' && !dto.labTestSourceId) {
      throw new BadRequestException(
        'labTestSourceId is required for TEST scope',
      );
    }
    const scope = dto.scope;
    const labTestKey = scope === 'TEST' ? (dto.labTestSourceId ?? '') : '';

    const planned = await this.plannedLinesFor(tenantId, dto, scope);
    const plannedByProduct = new Map(planned.map((l) => [l.productId, l]));

    const applied = await this.prisma.withTenant(tenantId, async (tx) => {
      // Resolve or create the parent consumption row (unique key serializes creates).
      let consumption = await tx.inventoryOrderConsumption.findUnique({
        where: { kalnosticsOrderId: dto.kalnosticsOrderId },
      });
      if (consumption && consumption.scope !== scope) {
        throw new ConsumptionScopeMismatchException(consumption.scope, scope);
      }
      if (!consumption) {
        consumption = await tx.inventoryOrderConsumption.create({
          data: {
            tenantId,
            branchId: dto.branchId,
            kalnosticsOrderId: dto.kalnosticsOrderId,
            orderCode: dto.orderCode,
            saleId: null,
            status: 'PENDING_MANUAL',
            scope,
            isAutoDeducted: false,
          },
        });
      }

      const existing = await tx.inventoryConsumptionLine.findMany({
        where: {
          tenantId,
          kalnosticsOrderId: dto.kalnosticsOrderId,
          scope,
          labTestSourceId: labTestKey,
          deletedAt: null,
        },
      });
      const existingByProduct = new Map(existing.map((l) => [l.productId, l]));

      const changes = dto.lines.map((ln) => {
        const line = existingByProduct.get(ln.productId);
        const p = plannedByProduct.get(ln.productId);
        const previousQty = line ? D(line.currentQty) : D(0);
        const finalQty = D(ln.finalQty);
        return {
          productId: ln.productId,
          planned: p,
          line,
          previousQty,
          finalQty,
          difference: finalQty.sub(previousQty),
          productName: p?.productName ?? line?.productName ?? ln.productId,
          productCode: p?.productCode ?? line?.productCode ?? null,
          plannedQty: p ? p.quantity : line ? D(line.plannedQty) : D(0),
          unitPrice: p?.unitPrice ?? (line ? D(line.unitPrice) : D(0)),
          taxRate: p?.taxRate ?? (line ? D(line.taxRate) : D(0)),
        };
      });

      // Pre-flight: a net additional deduction (difference > 0) must fit in stock.
      const addByProduct = new Map<string, Prisma.Decimal>();
      for (const c of changes) {
        if (c.difference.gt(0)) {
          addByProduct.set(
            c.productId,
            (addByProduct.get(c.productId) ?? D(0)).add(c.difference),
          );
        }
      }
      if (addByProduct.size > 0) {
        const stock = await this.stockByProduct(tenantId, dto.branchId, [
          ...addByProduct.keys(),
        ]);
        const shortages = [];
        for (const [productId, need] of addByProduct) {
          const have = stock.get(productId) ?? D(0);
          if (have.lt(need)) {
            const c = changes.find((x) => x.productId === productId)!;
            shortages.push({
              productId,
              productName: c.productName,
              requiredQty: need.toNumber(),
              availableQty: have.toNumber(),
            });
          }
        }
        if (shortages.length > 0) {
          throw new InsufficientConsumptionStockException(shortages);
        }
      }

      // Apply each change: stock delta, ledger upsert, audit row (on a real change).
      const changed: Array<{ productId: string; difference: number }> = [];
      for (const c of changes) {
        if (!c.difference.isZero()) {
          await this.stockService.applyDelta(tx, {
            tenantId,
            branchId: dto.branchId,
            productId: c.productId,
            delta: c.difference.negated(),
          });
        }

        if (c.line) {
          await tx.inventoryConsumptionLine.update({
            where: { id: c.line.id },
            data: {
              currentQty: c.finalQty,
              plannedQty: c.plannedQty,
              unitPrice: c.unitPrice,
              taxRate: c.taxRate,
              productName: c.productName,
              productCode: c.productCode,
            },
          });
        } else {
          await tx.inventoryConsumptionLine.create({
            data: {
              tenantId,
              branchId: dto.branchId,
              scope,
              kalnosticsOrderId: dto.kalnosticsOrderId,
              labTestSourceId: labTestKey,
              productId: c.productId,
              productName: c.productName,
              productCode: c.productCode,
              plannedQty: c.plannedQty,
              currentQty: c.finalQty,
              unitPrice: c.unitPrice,
              taxRate: c.taxRate,
              consumptionId: consumption.id,
            },
          });
        }

        if (!c.difference.isZero()) {
          await tx.inventoryConsumptionAdjustment.create({
            data: {
              tenantId,
              branchId: dto.branchId,
              consumptionId: consumption.id,
              scope,
              kalnosticsOrderId: dto.kalnosticsOrderId,
              labTestSourceId: labTestKey,
              productId: c.productId,
              productName: c.productName,
              plannedQty: c.plannedQty,
              previousQty: c.previousQty,
              finalQty: c.finalQty,
              difference: c.difference,
              reason: dto.reason,
              note: dto.note,
              createdBy: actorId,
            },
          });
          changed.push({
            productId: c.productId,
            difference: c.difference.toNumber(),
          });
        }
      }

      // Keep the linked sale consistent with the full current ledger for the order.
      const saleId = await this.rebuildSale(
        tx,
        tenantId,
        consumption,
        dto,
        actorId,
      );

      await tx.inventoryOrderConsumption.update({
        where: { id: consumption.id },
        data: { status: 'ADJUSTED', saleId },
      });

      this.logger.log(
        `Adjusted ${changed.length} product(s) for order ${dto.kalnosticsOrderId} (${scope}) → sale ${saleId ?? 'none'}`,
      );
      return { saleId, applied: changed };
    });

    // Fresh post-save view (committed), plus what changed.
    const view = await this.loadAdjustment(tenantId, dto);
    return { ...view, saleId: applied.saleId, applied: applied.applied };
  }

  /** A sale-item create payload from an aggregated product + its computed totals. */
  private saleItemData(
    tenantId: string,
    p: AggregatedProduct,
    c: {
      realUnitPrice: Prisma.Decimal;
      netUnitPrice: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    },
  ) {
    return {
      tenantId,
      productId: p.productId,
      productName: p.productName,
      productCode: p.productCode,
      quantity: p.quantity,
      price: p.unitPrice,
      realUnitPrice: c.realUnitPrice,
      netUnitPrice: c.netUnitPrice,
      taxRate: p.taxRate,
      taxAmount: c.taxAmount,
      subtotal: c.subtotal,
    };
  }

  /**
   * Rebuild the order's linked inventory sale from the full current ledger
   * (`currentQty > 0` across every scope row of the order). Updates the existing
   * sale in place, or — when auto-deduction was off and no sale exists yet — creates
   * it now as the financial mirror of the first manual deduction. Returns the sale
   * id (or null when nothing is deducted yet).
   */
  private async rebuildSale(
    tx: Prisma.TransactionClient,
    tenantId: string,
    consumption: {
      id: string;
      saleId: string | null;
      orderCode: string | null;
    },
    dto: SaveAdjustmentDto,
    actorId?: string,
  ): Promise<string | null> {
    const lines = await tx.inventoryConsumptionLine.findMany({
      where: {
        tenantId,
        kalnosticsOrderId: dto.kalnosticsOrderId,
        deletedAt: null,
      },
    });
    const byProduct = new Map<string, AggregatedProduct>();
    for (const l of lines) {
      const q = D(l.currentQty);
      if (q.lte(0)) continue;
      const e = byProduct.get(l.productId);
      if (e) e.quantity = e.quantity.add(q);
      else
        byProduct.set(l.productId, {
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          quantity: q,
          unitPrice: D(l.unitPrice),
          taxRate: D(l.taxRate),
        });
    }
    const products = [...byProduct.values()];

    const totals = computeOrderTotals({
      lines: products.map((p) => ({
        quantity: p.quantity.toNumber(),
        unitPrice: p.unitPrice.toNumber(),
        taxRatePercent: p.taxRate.toNumber(),
        taxInclusive: false,
      })),
      orderTaxPercent: 0,
      shipping: 0,
    });
    const date = dto.date ? new Date(dto.date) : new Date();
    const reference =
      dto.orderCode ?? consumption.orderCode ?? dto.kalnosticsOrderId;
    const saleFinancials = {
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      orderTax: totals.orderTax,
      totalTax: totals.totalTax,
      shipping: totals.shipping,
      roundoff: totals.roundoff,
      grandTotal: totals.grandTotal,
      totalItems: Math.round(totals.totalItems.toNumber()),
      paid: totals.grandTotal,
      paymentStatus: derivePaymentStatus(totals.grandTotal, totals.grandTotal),
    };

    if (consumption.saleId) {
      await tx.inventorySaleItem.deleteMany({
        where: { saleId: consumption.saleId },
      });
      await tx.inventorySale.update({
        where: { id: consumption.saleId },
        data: {
          ...saleFinancials,
          date,
          note: `Adjusted from kalnostics order ${reference}`,
          items: {
            create: products.map((p, i) =>
              this.saleItemData(tenantId, p, totals.lines[i]!),
            ),
          },
        },
      });
      return consumption.saleId;
    }

    // Auto-deduction was off and nothing is deducted yet → no sale to create.
    if (products.length === 0) return null;

    const customerId = await this.resolveCustomer(
      tx,
      tenantId,
      dto.patientId,
      dto.patientName,
    );
    const sale = await tx.inventorySale.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        customerId,
        reference,
        date,
        status: 'COMPLETED',
        ...saleFinancials,
        note: `Auto-generated from kalnostics order ${reference} (manual adjustment)`,
        createdBy: actorId,
        items: {
          create: products.map((p, i) =>
            this.saleItemData(tenantId, p, totals.lines[i]!),
          ),
        },
      },
      select: { id: true },
    });
    return sale.id;
  }

  /**
   * Get-or-create the inventory customer for a consumption sale, keyed on the
   * kalnostics patient id when supplied (so repeat orders reuse one customer).
   * Falls back to a shared "Kalnostics Orders" customer when no patient is given.
   */
  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    tenantId: string,
    patientId?: string,
    patientName?: string,
  ): Promise<string> {
    if (patientId) {
      const existing = await tx.inventoryCustomer.findFirst({
        where: { tenantId, patientId, deletedAt: null },
        select: { id: true },
      });
      if (existing) return existing.id;
      const created = await tx.inventoryCustomer.create({
        data: {
          tenantId,
          name: patientName?.trim() || 'Kalnostics Patient',
          patientId,
        },
        select: { id: true },
      });
      return created.id;
    }
    const shared = await tx.inventoryCustomer.findFirst({
      where: { tenantId, name: 'Kalnostics Orders', deletedAt: null },
      select: { id: true },
    });
    if (shared) return shared.id;
    const created = await tx.inventoryCustomer.create({
      data: { tenantId, name: 'Kalnostics Orders' },
      select: { id: true },
    });
    return created.id;
  }
}
