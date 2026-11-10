import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — product not found (or soft-deleted) in this tenant. */
export class ProductNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PRODUCT_NOT_FOUND',
      'Product not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — a product with this code already exists in the tenant. */
export class ProductCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'PRODUCT_CODE_CONFLICT',
      'A product with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — a stock subtraction would drive the branch quantity negative. */
export class InsufficientStockException extends KaltrosException {
  constructor(productId: string, available: number, requested: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Not enough stock at this branch (have ${available}, need ${requested})`,
      { productId, available, requested },
      HttpStatus.CONFLICT,
    );
  }
}

/** 400 — a branch context is required for this stock operation. */
export class BranchRequiredException extends KaltrosException {
  constructor() {
    super(
      'BRANCH_REQUIRED',
      'An active branch is required for stock operations',
      {},
      HttpStatus.BAD_REQUEST,
    );
  }
}
