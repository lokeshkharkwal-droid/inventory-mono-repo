import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — unit not found (or soft-deleted) in this tenant. */
export class UnitNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('UNIT_NOT_FOUND', 'Unit not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** 409 — a unit with this code already exists in the tenant. */
export class UnitCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'UNIT_CODE_CONFLICT',
      'A unit with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
