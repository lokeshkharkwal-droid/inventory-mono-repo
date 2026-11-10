import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — requisition not found (or soft-deleted) in this tenant. */
export class RequisitionNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'REQUISITION_NOT_FOUND',
      'Requisition not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — the requisition is not in a state that allows this action. */
export class InvalidRequisitionStateException extends KaltrosException {
  constructor(current: string, action: string) {
    super(
      'INVALID_REQUISITION_STATE',
      `Cannot ${action} a requisition that is ${current}`,
      { current, action },
      HttpStatus.CONFLICT,
    );
  }
}

/** 400 — a requesting branch is required (no active branch). */
export class RequisitionBranchRequiredException extends KaltrosException {
  constructor() {
    super(
      'REQUISITION_BRANCH_REQUIRED',
      'An active branch is required to create a requisition',
      {},
      HttpStatus.BAD_REQUEST,
    );
  }
}
