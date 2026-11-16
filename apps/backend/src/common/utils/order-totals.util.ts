import { Prisma } from '@prisma/client';

/**
 * Shared sale/purchase money engine — a faithful port of the legacy EZHT
 * (Stock Manager Advance) line + order total maths used by `Sales::add` and
 * `Purchases::add`. Sales call it with `unitPrice` = selling price; purchases
 * call it with `unitPrice` = unit cost. Everything is computed in
 * {@link Prisma.Decimal} to avoid float drift, then persisted on the header/items.
 */

const D = (v: number | string | Prisma.Decimal | null | undefined) =>
  new Prisma.Decimal(v ?? 0);

/** True when a discount/tax spec is a percentage (e.g. "10%"). */
function isPercentSpec(spec: string | number | null | undefined): boolean {
  return typeof spec === 'string' && spec.trim().endsWith('%');
}

/** Numeric value of a spec, ignoring a trailing `%`. */
function specValue(spec: string | number | null | undefined): Prisma.Decimal {
  if (spec == null || spec === '') return D(0);
  const raw = typeof spec === 'string' ? spec.replace('%', '').trim() : spec;
  const n = Number(raw);
  return Number.isFinite(n) ? D(n) : D(0);
}

/**
 * Resolve a discount/charge spec against a base amount.
 * `"10%"` → 10% of `base`; `"25"`/`25` → flat 25.
 */
export function resolveSpec(
  spec: string | number | null | undefined,
  base: Prisma.Decimal,
): Prisma.Decimal {
  if (spec == null || spec === '') return D(0);
  return isPercentSpec(spec)
    ? base.mul(specValue(spec)).div(100)
    : specValue(spec);
}

/** One line as entered on the form. */
export interface OrderLineInput {
  quantity: number | string;
  /** Selling price (sale) or unit cost (purchase), before discount/tax. */
  unitPrice: number | string;
  /** Per-unit discount spec: `"10%"` or a flat amount. */
  discount?: number | string | null;
  /** Tax-rate percentage for the line (e.g. 18 for 18%). */
  taxRatePercent?: number | string | null;
  /** When true the entered price already includes tax (legacy tax_method = 1). */
  taxInclusive?: boolean;
}

/** Order-level inputs layered on top of the lines. */
export interface OrderInput {
  lines: OrderLineInput[];
  /** Order discount spec: `"5%"` or a flat amount. */
  orderDiscount?: number | string | null;
  /** Order-level tax percentage applied after order discount. */
  orderTaxPercent?: number | string | null;
  shipping?: number | string | null;
  /** Decimal places to round the grand total to; `null`/absent = no rounding. */
  roundoffTo?: number | null;
  /** India GST: true ⇒ IGST (inter-state); false ⇒ CGST+SGST (intra-state). */
  interState?: boolean;
}

/** Per-line computed money, mirrors the columns persisted on `*_items`. */
export interface ComputedLine {
  quantity: Prisma.Decimal;
  realUnitPrice: Prisma.Decimal;
  /** Unit price net of discount and (if inclusive) tax. */
  netUnitPrice: Prisma.Decimal;
  unitTax: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discount: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  igst: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
}

/** Aggregated order money, mirrors the columns persisted on the header. */
export interface ComputedOrder {
  lines: ComputedLine[];
  subtotal: Prisma.Decimal;
  productTax: Prisma.Decimal;
  productDiscount: Prisma.Decimal;
  orderDiscount: Prisma.Decimal;
  orderTax: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  shipping: Prisma.Decimal;
  roundoff: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  totalItems: Prisma.Decimal;
  igst: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
}

/** Split a tax amount into IGST or CGST+SGST per the order's state context. */
function splitGst(tax: Prisma.Decimal, interState: boolean) {
  if (interState) return { igst: tax, cgst: D(0), sgst: D(0) };
  const half = tax.div(2);
  return { igst: D(0), cgst: half, sgst: half };
}

/**
 * Compute a full sale/purchase (per-line + order aggregates), matching the
 * legacy SMA engine: per-unit discount (`%`/flat) → net unit price, tax
 * inclusive vs exclusive, GST split, order discount/tax/shipping, roundoff and
 * grand total.
 */
export function computeOrderTotals(input: OrderInput): ComputedOrder {
  const interState = input.interState ?? false;

  const lines: ComputedLine[] = input.lines.map((l) => {
    const qty = D(l.quantity);
    const realUnitPrice = D(l.unitPrice);
    const taxRate = D(l.taxRatePercent ?? 0);
    const discountPerUnit = resolveSpec(l.discount, realUnitPrice);
    const afterDiscount = realUnitPrice.sub(discountPerUnit);

    let netUnitPrice: Prisma.Decimal;
    let unitTax: Prisma.Decimal;
    if (l.taxInclusive) {
      // Price includes tax: back out the tax component.
      unitTax = afterDiscount
        .mul(taxRate)
        .div(D(100).add(taxRate).lte(0) ? D(1) : D(100).add(taxRate));
      netUnitPrice = afterDiscount.sub(unitTax);
    } else {
      netUnitPrice = afterDiscount;
      unitTax = netUnitPrice.mul(taxRate).div(100);
    }

    const discount = discountPerUnit.mul(qty);
    const taxAmount = unitTax.mul(qty);
    const subtotal = netUnitPrice.mul(qty).add(taxAmount);
    const gst = splitGst(taxAmount, interState);

    return {
      quantity: qty,
      realUnitPrice,
      netUnitPrice,
      unitTax,
      taxAmount,
      discount,
      subtotal,
      ...gst,
    };
  });

  const productBase = lines.reduce(
    (s, l) => s.add(l.netUnitPrice.mul(l.quantity)),
    D(0),
  );
  const productTax = lines.reduce((s, l) => s.add(l.taxAmount), D(0));
  const productDiscount = lines.reduce((s, l) => s.add(l.discount), D(0));
  const totalItems = lines.reduce((s, l) => s.add(l.quantity), D(0));

  const orderDiscount = resolveSpec(
    input.orderDiscount,
    productBase.add(productTax),
  );
  const afterOrderDiscount = productBase.add(productTax).sub(orderDiscount);
  const orderTax = D(input.orderTaxPercent ?? 0).gt(0)
    ? afterOrderDiscount.mul(D(input.orderTaxPercent ?? 0)).div(100)
    : D(0);
  const shipping = D(input.shipping ?? 0);
  const totalTax = productTax.add(orderTax);

  const rawGrand = productBase
    .add(productTax)
    .add(orderTax)
    .add(shipping)
    .sub(orderDiscount);

  let roundoff = D(0);
  let grandTotal = rawGrand;
  if (input.roundoffTo != null) {
    grandTotal = rawGrand.toDecimalPlaces(
      input.roundoffTo,
      Prisma.Decimal.ROUND_HALF_UP,
    );
    roundoff = grandTotal.sub(rawGrand);
  }

  // Order-level GST: line GST plus the order-tax component, split the same way.
  const orderGst = splitGst(orderTax, interState);
  const igst = lines.reduce((s, l) => s.add(l.igst), D(0)).add(orderGst.igst);
  const cgst = lines.reduce((s, l) => s.add(l.cgst), D(0)).add(orderGst.cgst);
  const sgst = lines.reduce((s, l) => s.add(l.sgst), D(0)).add(orderGst.sgst);

  return {
    lines,
    subtotal: productBase,
    productTax,
    productDiscount,
    orderDiscount,
    orderTax,
    totalTax,
    shipping,
    roundoff,
    grandTotal,
    totalItems,
    igst,
    cgst,
    sgst,
  };
}

/** Derive the PENDING/PARTIAL/PAID status from paid vs grand total. */
export function derivePaymentStatus(
  paid: Prisma.Decimal,
  grandTotal: Prisma.Decimal,
): 'PENDING' | 'PARTIAL' | 'PAID' {
  if (paid.gte(grandTotal) && grandTotal.gt(0)) return 'PAID';
  if (paid.gt(0)) return 'PARTIAL';
  return 'PENDING';
}
