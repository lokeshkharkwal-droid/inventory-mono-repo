import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { generateReference } from '../../common/utils/reference.util';

/** Document kinds whose numbering prefix is configurable in settings. */
export type NumberedDoc = 'purchase' | 'sale' | 'transfer' | 'requisition';

/**
 * Generates document references using the tenant's configured prefixes
 * (InventorySetting). Closes the Phase-1 gap where transaction services used
 * hard-coded prefixes — they now defer to settings.
 */
@Injectable()
export class NumberingService {
  constructor(private readonly settings: SettingsService) {}

  /**
   * Build the next reference for a document kind, using the active branch's
   * prefix (falling back to the tenant-level default when `branchId` is omitted).
   */
  async next(
    tenantId: string,
    doc: NumberedDoc,
    branchId: string | null = null,
  ): Promise<string> {
    const s = await this.settings.get(tenantId, branchId);
    const prefix: string =
      doc === 'purchase'
        ? s.purchasePrefix
        : doc === 'sale'
          ? s.salePrefix
          : doc === 'transfer'
            ? s.transferPrefix
            : s.requisitionPrefix;
    return generateReference(prefix);
  }
}
