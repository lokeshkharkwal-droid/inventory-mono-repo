import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — variant template not found (or soft-deleted) in this tenant. */
export class VariantNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'VARIANT_NOT_FOUND',
      'Variant not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}
