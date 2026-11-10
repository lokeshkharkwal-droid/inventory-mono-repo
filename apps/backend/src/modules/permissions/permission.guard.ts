import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '../../common/exceptions/kaltros.exception';
import { AuthenticatedRequest } from '../auth/types/jwt-payload.type';
import { REQUIRE_PERMISSION_KEY } from './decorators/require-permission.decorator';
import { PermissionsService } from './permissions.service';

/**
 * Enforces `@RequirePermission(...)` on routes. Non-breaking: routes without the
 * decorator are allowed (auth already ran). For gated routes, the caller's
 * effective permissions are resolved from the JWT `active_profile_key`; all
 * required keys must be present (superusers bypass via the baseline).
 *
 * Registered after `JwtAuthGuard` in AppModule so `req.user` is populated.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    // No authenticated user (e.g. a @Public route that also declared a
    // permission) — let the auth layer be the gate.
    if (!user) return true;

    // Effective permissions = user assignment → tenant override → code baseline.
    const granted = new Set(
      await this.permissions.resolveEffective(
        user.tenant_id,
        user.person_id,
        user.active_profile_key,
      ),
    );
    const missing = required.filter((k) => !granted.has(k));
    if (missing.length > 0) {
      throw new ForbiddenException(
        'perform',
        `this action (${missing.join(', ')})`,
      );
    }
    return true;
  }
}
