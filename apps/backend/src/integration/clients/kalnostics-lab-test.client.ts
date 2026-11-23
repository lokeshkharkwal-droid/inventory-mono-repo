import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** A tenant master lab-test option as returned by `GET /lab-tests/options`. */
export interface LabTestOption {
  id: string;
  name: string;
}

/**
 * Typed client for kalnostics-new lab-test endpoints. Proforma lab-test mapping
 * targets the tenant's **canonical master** lab tests — the one row per logical
 * test that `GET /lab-tests/options` returns (the `sourceMasterLabTestId IS NULL`
 * originals; per-branch synced copies are collapsed out). At order time kalnostics
 * resolves each ordered branch lab test to that same canonical id, so a mapping
 * made here matches an order item at consumption time regardless of which branch
 * it ran at (CLAUDE.md §4.5; "master lab tests" decision).
 */
@Injectable()
export class KalnosticsLabTestClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /**
   * List the tenant's active master lab tests as `{ id, name }` picker options,
   * paginated + searchable. Forwards the caller's JWT, so kalnostics scopes the
   * result to the caller's tenant.
   */
  async getOptions(opts: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: LabTestOption[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.http.getPaged<LabTestOption>('/lab-tests/options', {
      search: opts.search,
      page: opts.page ?? 1,
      limit: opts.limit ?? 20,
    });
  }
}
