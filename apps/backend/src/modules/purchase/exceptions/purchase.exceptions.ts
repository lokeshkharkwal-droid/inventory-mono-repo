import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — purchase not found (or soft-deleted) in this tenant. */
export class PurchaseNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PURCHASE_NOT_FOUND',
      'Purchase not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a payment would exceed the purchase's outstanding balance. */
export class PaymentExceedsBalanceException extends KaltrosException {
  constructor(outstanding: number, amount: number) {
    super(
      'PAYMENT_EXCEEDS_BALANCE',
      `Payment (${amount}) exceeds the outstanding balance (${outstanding})`,
      { outstanding, amount },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * 409 — the purchase is locked against this operation (EZHT edit/delete rules):
 * it already has a return, and/or (for delete) recorded payments.
 */
export class PurchaseLockedException extends KaltrosException {
  constructor(reason: string, context: Record<string, unknown> = {}) {
    super('PURCHASE_LOCKED', reason, context, HttpStatus.CONFLICT);
  }
}
