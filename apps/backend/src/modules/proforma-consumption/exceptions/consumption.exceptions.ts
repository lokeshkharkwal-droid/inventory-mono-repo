import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

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
