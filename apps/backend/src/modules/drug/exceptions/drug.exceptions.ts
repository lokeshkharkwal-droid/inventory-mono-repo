import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 404 — drug not found (or soft-deleted) in this tenant. */
export class DrugNotFoundException extends KaltrosException {
  constructor(id: string) {
    super('DRUG_NOT_FOUND', 'Drug not found', { id }, HttpStatus.NOT_FOUND);
  }
}
