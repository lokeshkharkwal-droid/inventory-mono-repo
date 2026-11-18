import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductStockService } from '../product/product-stock.service';
import {
  computeOrderTotals,
  derivePaymentStatus,
} from '../../common/utils/order-totals.util';
import {
  ConsumeConsumptionDto,
  ValidateConsumptionDto,
} from './dto/consumption.dto';
import { InsufficientConsumptionStockException } from './exceptions/consumption.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** A product line aggregated across every matched proforma (summed quantity). */
interface AggregatedProduct {
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
   * its product lines (quantities summed when a product recurs across proformas).
   */
  private async resolveMatchedProformas(
    tenantId: string,
    branchId: string,
    labTestSourceIds: string[],
  ): Promise<MatchedProforma[]> {
    if (labTestSourceIds.length === 0) return [];

    // 1. Proformas mapped to any of these master lab tests.
    const labRelations = await this.prisma.inventoryProformaRelation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        entityType: 'lab_test',
        entityId: { in: labTestSourceIds },
      },
      select: { proformaId: true },
    });
    const candidateIds = [...new Set(labRelations.map((r) => r.proformaId))];
    if (candidateIds.length === 0) return [];

    // 2. Of those, keep only the ones also enabled for the active branch.
    const branchRelations = await this.prisma.inventoryProformaRelation.findMany(
      {
        where: {
          tenantId,
          deletedAt: null,
          entityType: 'branch',
          entityId: branchId,
          proformaId: { in: candidateIds },
        },
        select: { proformaId: true },
      },
    );
    const matchedIds = [...new Set(branchRelations.map((r) => r.proformaId))];
    if (matchedIds.length === 0) return [];

    // 3. Load the matched proformas + their product lines.
    const proformas = await this.prisma.inventoryProforma.findMany({
      where: { id: { in: matchedIds }, tenantId, deletedAt: null },
      include: { items: true },
    });

    return proformas.map((p) => {
      const byProduct = new Map<string, AggregatedProduct>();
      for (const it of p.items) {
        const existing = byProduct.get(it.productId);
        if (existing) {
          existing.quantity = existing.quantity.add(it.quantity);
        } else {
          byProduct.set(it.productId, {
            productId: it.productId,
            productName: it.productName,
            productCode: it.productCode,
            quantity: D(it.quantity),
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

    const matched = await this.resolveMatchedProformas(
      tenantId,
      dto.branchId,
      dto.labTestSourceIds,
    );
    const required = this.aggregateProducts(matched);
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

      await tx.inventoryOrderConsumption.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          kalnosticsOrderId: dto.kalnosticsOrderId,
          orderCode: dto.orderCode,
          saleId: sale.id,
          status: 'CONSUMED',
        },
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
