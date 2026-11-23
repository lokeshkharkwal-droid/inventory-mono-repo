import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — quote not found (or soft-deleted) in this tenant. */
export class QuoteNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('QUOTE_NOT_FOUND', 'Quote not found', { id }, HttpStatus.NOT_FOUND);
  }
}

/** 400 — the quote is missing the party required for its type. */
export class QuotePartyRequiredException extends KaltrosException {
  constructor(type: string) {
    super(
      'QUOTE_PARTY_REQUIRED',
      type === 'SALE'
        ? 'A customer is required for a sales quote'
        : 'A supplier is required for a purchase quote',
      { type },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 409 — the quote cannot be converted in its current state/type. */
export class QuoteNotConvertibleException extends KaltrosException {
  constructor(reason: string) {
    super('QUOTE_NOT_CONVERTIBLE', reason, {}, HttpStatus.CONFLICT);
  }
}

/** 400 — a manual (off-catalogue) line needs a product name. */
export class QuoteLineInvalidException extends KaltrosException {
  constructor() {
    super(
      'QUOTE_LINE_INVALID',
      'A manual line needs a product name (or select a catalogue product)',
      {},
      HttpStatus.BAD_REQUEST,
    );
  }
}
