import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** Lightweight external-referral option for the Add-Sale "Referral" selector. */
export interface ReferralOption {
  id: string;
  name: string;
}

/**
 * Typed client for kalnostics-new External Referrals — the system that backs the
 * legacy EZHT sale "Referral" dropdown (EZHT fed it from the shared LIMS via
 * `yii_session->getReferrals()`). Lists `{ id, name }` options for the selector and
 * creates a referral inline ("Add Referral" on the sale form). The caller's bearer
 * token is forwarded, so kalnostics composes the record in the caller's tenant.
 */
@Injectable()
export class KalnosticsReferralClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /** List external referrals as `{ id, name }` picker options (paginated, searchable). */
  async getOptions(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ReferralOption[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.http.getPaged<ReferralOption>('/external-referrals/options', {
      search: params?.search,
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    });
  }

  /**
   * Create an external referral in the caller's tenant (inline "Add Referral").
   * The body is forwarded verbatim to kalnostics `POST /external-referrals`, which
   * validates it (`name` required; the rest optional).
   */
  async create(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post('/external-referrals', body);
  }
}
