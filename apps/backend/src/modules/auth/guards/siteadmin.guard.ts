import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SiteAdminJwtPayload } from '../types/siteadmin-jwt.type';

/**
 * Requires a valid SiteAdmin JWT (`'jwt-siteadmin'`). Apply per-route together
 * with `@Public()` so the global business `JwtAuthGuard` is bypassed. Stores the
 * validated payload on `req.siteadmin` (separate from the business `req.user`).
 *
 * The inventory backend has no SiteAdmin role catalogue of its own, so any valid
 * SiteAdmin token is authorised — fine-grained role gating stays in kalnostics-new.
 */
@Injectable()
export class SiteAdminGuard extends AuthGuard('jwt-siteadmin') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok)
      throw new UnauthorizedException('SiteAdmin authentication required');
    const request = context.switchToHttp().getRequest<{
      user?: SiteAdminJwtPayload;
      siteadmin?: SiteAdminJwtPayload;
    }>();
    if (request.user) request.siteadmin = request.user;
    return true;
  }

  /** Surface a clean 401 instead of Passport's default. */
  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException('Invalid or expired SiteAdmin token');
    }
    return user;
  }
}
