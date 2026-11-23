import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — sale not found (or soft-deleted) in this tenant. */
export class SaleNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('SALE_NOT_FOUND', 'Sale not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** 409 — a payment would exceed the sale's outstanding balance. */
export class SalePaymentExceedsBalanceException extends KaltrosException {
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
 * 409 — a fully-paid sale return cannot take another payment (EZHT: when
 * `paid == grand_total` the "Payment was returned" guard blocks add_payment).
 */
export class SaleReturnPaymentBlockedException extends KaltrosException {
  constructor(id: string) {
    super(
      'SALE_RETURN_PAYMENT_BLOCKED',
      'This return is fully settled — no further payment can be added.',
      { id },
      HttpStatus.CONFLICT,
    );
  }
}
