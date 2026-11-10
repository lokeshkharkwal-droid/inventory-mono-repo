import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — register not found in this tenant. */
export class RegisterNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'REGISTER_NOT_FOUND',
      'Register not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 404 — register session not found in this tenant. */
export class SessionNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'SESSION_NOT_FOUND',
      'Register session not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — the register already has an open session. */
export class RegisterAlreadyOpenException extends KaltrosException {
  constructor(registerId: string) {
    super(
      'REGISTER_ALREADY_OPEN',
      'This register already has an open session',
      { registerId },
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — the session is already closed. */
export class SessionClosedException extends KaltrosException {
  constructor(id: string) {
    super(
      'SESSION_CLOSED',
      'This session is already closed',
      { id },
      HttpStatus.CONFLICT,
    );
  }
}

/** 400 — no open register session for the branch (required for checkout). */
export class NoOpenSessionException extends KaltrosException {
  constructor() {
    super(
      'NO_OPEN_SESSION',
      'Open a register session before ringing up sales',
      {},
      HttpStatus.BAD_REQUEST,
    );
  }
}
