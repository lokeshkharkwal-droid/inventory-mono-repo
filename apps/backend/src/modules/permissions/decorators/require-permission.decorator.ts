import { SetMetadata } from '@nestjs/common';

/** Metadata key holding the permission keys a route requires (AND semantics). */
export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Require one or more inventory permission keys on a route. The global
 * `PermissionGuard` enforces them against the caller's resolved permissions.
 * Routes without this decorator are not permission-gated (auth still applies).
 *
 * @example @RequirePermission('inventory:products__delete')
 */
export const RequirePermission = (...keys: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, keys);
