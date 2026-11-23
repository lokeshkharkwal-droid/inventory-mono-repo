import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/**
 * 409 — a manual adjustment was requested at a different granularity than the one
 * this order's inventory was recorded at. Prevents a per-test adjustment from
 * double-deducting on top of an order-level deduction (and vice-versa) after the
 * tenant switched manual-adjustment modes.
 */
export class ConsumptionScopeMismatchException extends KaltrosException {
  constructor(recordedScope: string, requestedScope: string) {
    super(
      'INVENTORY_ADJUSTMENT_SCOPE_MISMATCH',
      `This order's inventory was recorded at ${recordedScope} granularity; it cannot be adjusted at ${requestedScope} granularity. Switch Inventory Settings back to ${recordedScope === 'ORDER' ? 'Order Type' : 'Test Type'} to adjust it.`,
      { recordedScope, requestedScope },
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — not enough stock to fulfil a proforma-mapped consumption. */
export class InsufficientConsumptionStockException extends KaltrosException {
  constructor(
    shortages: Array<{
      productId: string;
      productName: string;
      requiredQty: number;
      availableQty: number;
    }>,
  ) {
    const summary = shortages
      .map(
        (s) =>
          `${s.productName} (need ${s.requiredQty}, have ${s.availableQty})`,
      )
      .join('; ');
    super(
      'INSUFFICIENT_INVENTORY_STOCK',
      `Not enough inventory stock for: ${summary}`,
      { shortages },
      HttpStatus.CONFLICT,
    );
  }
}
