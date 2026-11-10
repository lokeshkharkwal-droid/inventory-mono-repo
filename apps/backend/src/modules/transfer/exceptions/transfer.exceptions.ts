import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — transfer not found (or soft-deleted) in this tenant. */
export class TransferNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'TRANSFER_NOT_FOUND',
      'Transfer not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 400 — source and destination branch must differ. */
export class SameBranchTransferException extends KaltrosException {
  constructor() {
    super(
      'SAME_BRANCH_TRANSFER',
      'Source and destination branches must be different',
      {},
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 409 — the transfer is not in a state that allows this action. */
export class InvalidTransferStateException extends KaltrosException {
  constructor(current: string, action: string) {
    super(
      'INVALID_TRANSFER_STATE',
      `Cannot ${action} a transfer that is ${current}`,
      { current, action },
      HttpStatus.CONFLICT,
    );
  }
}
