import { Controller, Get, Query } from '@nestjs/common';
import { KalnosticsBranchClient } from './clients/kalnostics-branch.client';
import { KalnosticsDepartmentClient } from './clients/kalnostics-department.client';
import { KalnosticsLocationClient } from './clients/kalnostics-location.client';
import { KalnosticsUsersClient } from './clients/kalnostics-users.client';

/**
 * Thin passthrough endpoints exposing kalnostics reference data the inventory
 * frontend needs (e.g. branch + department pickers for transfers/requisitions,
 * SiteAdmin location data for address forms). Forwards the caller's JWT via the
 * global RequestTokenInterceptor.
 */
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly branchClient: KalnosticsBranchClient,
    private readonly departmentClient: KalnosticsDepartmentClient,
    private readonly locationClient: KalnosticsLocationClient,
    private readonly usersClient: KalnosticsUsersClient,
  ) {}

  /** Branch (warehouse) options, optionally filtered by branch type. */
  @Get('branches')
  branches(@Query('branchType') branchType?: string) {
    return this.branchClient.getOptions(
      branchType ? { branchType } : undefined,
    );
  }

  /** Active tenant department options (for requisition From/To pickers). */
  @Get('departments')
  departments() {
    return this.departmentClient.getOptions();
  }

  /**
   * Tenant staff options (`{ id, name }`, paginated/searchable) — powers the
   * "Created By" / "User" report filters, resolving inventory `createdBy` /
   * `openedBy` person ids to names.
   */
  @Get('users')
  users(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersClient.getOptions({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── SiteAdmin location reference (Country → State → City) ──────────────────

  /** Countries (paginated; `search`). */
  @Get('locations/countries')
  countries(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationClient.countries({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** States, filtered by `countryId` (paginated; `search`). */
  @Get('locations/states')
  states(
    @Query('countryId') countryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationClient.states({
      countryId,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Cities, filtered by `stateId`/`countryId` (paginated; `search`). */
  @Get('locations/cities')
  cities(
    @Query('stateId') stateId?: string,
    @Query('countryId') countryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationClient.cities({
      stateId,
      countryId,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Areas/localities, filtered by `cityId`/`stateId` (paginated; `search`). */
  @Get('locations/areas')
  areas(
    @Query('cityId') cityId?: string,
    @Query('stateId') stateId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationClient.areas({
      cityId,
      stateId,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
