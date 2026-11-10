import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — tax rate not found (or soft-deleted) in this tenant. */
export class TaxRateNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'TAX_RATE_NOT_FOUND',
      'Tax rate not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a tax rate with this code already exists in the tenant. */
export class TaxRateCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'TAX_RATE_CODE_CONFLICT',
      'A tax rate with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
