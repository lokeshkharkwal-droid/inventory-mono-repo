import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — supplier not found (or soft-deleted) in this tenant. */
export class SupplierNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'SUPPLIER_NOT_FOUND',
      'Supplier not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}
