import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** A tenant master lab-test option as returned by `GET /lab-tests/options`. */
export interface LabTestOption {
  id: string;
  name: string;
}

/**
 * Typed client for kalnostics-new lab-test endpoints. Proforma lab-test mapping
 * targets the tenant's **master** lab tests (`LabTest.id`), which is also the id a
 * branch lab test records as its `sourceLabTestId` — so a mapping made here matches
 * an order item at consumption time (CLAUDE.md §4.5; "master lab tests" decision).
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
