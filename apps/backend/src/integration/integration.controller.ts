import { Controller, Get, Query } from '@nestjs/common';
import { KalnosticsBranchClient } from './clients/kalnostics-branch.client';
import { KalnosticsDepartmentClient } from './clients/kalnostics-department.client';

/**
 * Thin passthrough endpoints exposing kalnostics reference data the inventory
 * frontend needs (e.g. branch + department pickers for transfers/requisitions).
 * Forwards the caller's JWT via the global RequestTokenInterceptor.
 */
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly branchClient: KalnosticsBranchClient,
    private readonly departmentClient: KalnosticsDepartmentClient,
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
}
