import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — customer not found (or soft-deleted) in this tenant. */
export class CustomerNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'CUSTOMER_NOT_FOUND',
      'Customer not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}
