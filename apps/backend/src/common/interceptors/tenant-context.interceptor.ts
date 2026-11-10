import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext, TenantContextStore } from '../../prisma/tenant-context';

/** Minimal shape we read off the authenticated request (business JWT). */
interface MaybeTenantRequest {
  user?: {
    tenant_id?: string;
    active_profile_key?: string | null;
    referral_panel_id?: string | null;
  };
}

/**
 * Establishes the per-request tenant context (`AsyncLocalStorage`) from the
 * business JWT's `tenant_id`, so the Prisma RLS extension can scope queries.
 *
 * Runs after the auth guard (so `req.user` is populated). Requests without a
 * tenant (e.g. `@Public()`) pass through with no context — the extension then
 * leaves the tenant GUC unset. Mirrors kalnostics-new's interceptor so both
 * services behave identically against the shared database.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<MaybeTenantRequest>();
    const user = request?.user;
    const tenantId = user?.tenant_id;
    if (!tenantId) {
      return next.handle();
    }

    const store: TenantContextStore = { tenantId };
    if (user?.referral_panel_id) {
      store.referralPanelId = user.referral_panel_id;
    }

    return new Observable((subscriber) => {
      tenantContext.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
