import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** A location option (country/state/city) as returned by kalnostics `/locations/*`. */
export interface LocationOption {
  id: string;
  name: string;
  code?: string | null;
  [key: string]: unknown;
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Typed client for kalnostics-new's SiteAdmin-owned location reference data
 * (Country → State → City), the same dataset managed at /admin/locations. Used by
 * the inventory address forms' dependent dropdowns. Forwards the caller's JWT.
 */
@Injectable()
export class KalnosticsLocationClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  countries(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paged<LocationOption>> {
    return this.http.getPaged<LocationOption>('/locations/countries', {
      search: params.search,
      page: params.page,
      limit: params.limit,
    });
  }

  states(params: {
    countryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paged<LocationOption>> {
    return this.http.getPaged<LocationOption>('/locations/states', {
      countryId: params.countryId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    });
  }

  cities(params: {
    stateId?: string;
    countryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paged<LocationOption>> {
    return this.http.getPaged<LocationOption>('/locations/cities', {
      stateId: params.stateId,
      countryId: params.countryId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    });
  }

  areas(params: {
    cityId?: string;
    stateId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paged<LocationOption>> {
    return this.http.getPaged<LocationOption>('/locations/areas', {
      cityId: params.cityId,
      stateId: params.stateId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    });
  }
}
