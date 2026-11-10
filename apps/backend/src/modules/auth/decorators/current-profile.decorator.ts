import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/jwt-payload.type';

/** The active profile/branch context resolved from the JWT. */
export interface ActiveProfile {
  profileKey: string | null;
  branchId: string | null;
  branchType: string | null;
}

/**
 * Injects the active profile context (`active_profile_key` + `active_branch_id`
 * + `active_branch_type`) from the authenticated user's JWT. The active branch
 * is the inventory "warehouse" for branch-level reads/writes.
 */
export const CurrentProfile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveProfile => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return {
      profileKey: request.user.active_profile_key,
      branchId: request.user.active_branch_id,
      branchType: request.user.active_branch_type,
    };
  },
);
