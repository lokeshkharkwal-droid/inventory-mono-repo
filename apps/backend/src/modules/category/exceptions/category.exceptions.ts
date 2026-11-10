import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — category not found (or soft-deleted) in this tenant. */
export class CategoryNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'CATEGORY_NOT_FOUND',
      'Category not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a category with this code already exists in the tenant. */
export class CategoryCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'CATEGORY_CODE_CONFLICT',
      'A category with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}
