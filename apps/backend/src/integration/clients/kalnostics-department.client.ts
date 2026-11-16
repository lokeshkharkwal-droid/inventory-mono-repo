import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** Lightweight department option as returned by `GET /departments`. */
export interface DepartmentOption {
  id: string;
  name: string;
  shortName?: string | null;
  code?: string | null;
}

/** A raw department row from kalnostics `GET /departments` (paginated `data`). */
interface KalnosticsDepartment {
  id: string;
  name: string;
  shortName?: string | null;
  code?: string | null;
  isActive?: boolean;
}

/**
 * Typed client for kalnostics-new department endpoints. Departments are
 * tenant-scoped (not branch-scoped) in kalnostics, so this lists all active
 * departments for the caller's tenant — used to populate the requisition
 * From/To Department pickers.
 */
@Injectable()
export class KalnosticsDepartmentClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /** List active tenant departments as lightweight picker options. */
  async getOptions(): Promise<DepartmentOption[]> {
    const rows = await this.http.get<KalnosticsDepartment[]>('/departments', {
      status: 'ACTIVE',
      limit: 100,
    });
    return (rows ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName ?? null,
      code: d.code ?? null,
    }));
  }
}
