import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — sub-category not found (or soft-deleted) in this tenant. */
export class SubCategoryNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'SUB_CATEGORY_NOT_FOUND',
      'Sub-category not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a sub-category with this code already exists in the tenant. */
export class SubCategoryCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'SUB_CATEGORY_CODE_CONFLICT',
      'A sub-category with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
