import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — the selected batch was not found (or soft-deleted) for this tenant/branch/product. */
export class BatchNotFoundException extends KaltrosException {
  constructor(batchId: string) {
    super(
      'BATCH_NOT_FOUND',
      'The selected batch was not found at this branch',
      { batchId },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — the selected batch does not hold enough quantity for the requested amount. */
export class InsufficientBatchQuantityException extends KaltrosException {
  constructor(batchId: string, available: number, requested: number) {
    super(
      'INSUFFICIENT_BATCH_QUANTITY',
      `Not enough quantity in the selected batch (have ${available}, need ${requested})`,
      { batchId, available, requested },
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — selling from an expired batch is blocked by tenant policy. */
export class ExpiredBatchException extends KaltrosException {
  constructor(batchId: string, expiryDate: string) {
    super(
      'EXPIRED_BATCH',
      'The selected batch has expired and cannot be sold',
      { batchId, expiryDate },
      HttpStatus.CONFLICT,
    );
  }
}
