import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — manufacturer not found (or soft-deleted) in this tenant. */
export class ManufacturerNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'MANUFACTURER_NOT_FOUND',
      'Manufacturer not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a manufacturer with this code already exists in the tenant. */
export class ManufacturerCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'MANUFACTURER_CODE_CONFLICT',
      'A manufacturer with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
