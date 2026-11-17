import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/** Lightweight user/staff option for report "Created By" / "User" pickers. */
export interface UserOption {
  id: string;
  name: string;
}

/** A raw user row from kalnostics `GET /users/manage` (paginated `data`). */
interface KalnosticsUser {
  id: string;
  userCode?: string | null;
  employeeName?: string | null;
  username?: string | null;
  email?: string | null;
}

/**
 * Typed client for kalnostics-new user/staff listing. Staff identity lives on the
 * kalnostics auth layer (Person/RBAC), not on inventory models — inventory only
 * stores a person UUID in `createdBy`/`openedBy`. This resolves those ids to names
 * so the Materials / Tools & Plants / Register report filters can offer a real
 * "Created By" / "User" dropdown (mirrors the legacy `reports_model->getStaff()`).
 */
@Injectable()
export class KalnosticsUsersClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /** List tenant staff as `{ id, name }` picker options (paginated, searchable). */
  async getOptions(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: UserOption[];
    total: number;
    page: number;
    limit: number;
  }> {
    const paged = await this.http.getPaged<KalnosticsUser>('/users/manage', {
      search: params?.search,
      page: params?.page ?? 1,
      limit: params?.limit ?? 100,
    });
    return {
      ...paged,
      data: paged.data.map((u) => ({
        id: u.id,
        name: u.employeeName || u.username || u.userCode || u.email || '—',
      })),
    };
  }
}
