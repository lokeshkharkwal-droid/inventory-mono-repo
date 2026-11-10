import { Controller, Get, Query } from '@nestjs/common';
import { KalnosticsBranchClient } from './clients/kalnostics-branch.client';

/**
 * Thin passthrough endpoints exposing kalnostics reference data the inventory
 * frontend needs (e.g. branch pickers for transfers). Forwards the caller's JWT
 * via the global RequestTokenInterceptor.
 */
@Controller('integration')
export class IntegrationController {
  constructor(private readonly branchClient: KalnosticsBranchClient) {}

  /** Branch (warehouse) options, optionally filtered by branch type. */
  @Get('branches')
  branches(@Query('branchType') branchType?: string) {
    return this.branchClient.getOptions(
      branchType ? { branchType } : undefined,
    );
  }
}
