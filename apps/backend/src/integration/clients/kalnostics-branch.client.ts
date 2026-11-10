import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** Lightweight branch option as returned by `GET /branches/options`. */
export interface BranchOption {
  id: string;
  name: string;
  branchType?: string | null;
  code?: string | null;
}

/** A fuller branch record from `GET /branches/:id`. */
export interface BranchDetail {
  id: string;
  name: string;
  code?: string | null;
  branchType?: string | null;
  [key: string]: unknown;
}

/**
 * Typed client for kalnostics-new branch endpoints. In inventory terms a
 * "warehouse" is a kalnostics `Branch` (`BranchType.INVENTORY`/`BLOOD_BANK`), so
 * this is how inventory resolves and validates its locations.
 */
@Injectable()
export class KalnosticsBranchClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /**
   * List branches as lightweight picker options.
   * @param opts optional filters (e.g. `branchType: 'INVENTORY'`).
   */
  async getOptions(opts?: {
    branchType?: string;
    moduleKey?: string;
  }): Promise<BranchOption[]> {
    return this.http.get<BranchOption[]>('/branches/options', {
      branchType: opts?.branchType,
      moduleKey: opts?.moduleKey,
    });
  }

  /**
   * Fetch one branch by id, validating it belongs to the caller's tenant (the
   * kalnostics endpoint enforces tenant scope + returns 404 otherwise).
   */
  async findById(id: string): Promise<BranchDetail> {
    return this.http.get<BranchDetail>(`/branches/${id}`);
  }
}
