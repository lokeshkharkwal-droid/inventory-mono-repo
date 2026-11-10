import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — brand not found (or soft-deleted) in this tenant. */
export class BrandNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('BRAND_NOT_FOUND', 'Brand not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** 409 — a brand with this code already exists in the tenant. */
export class BrandCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'BRAND_CODE_CONFLICT',
      'A brand with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
