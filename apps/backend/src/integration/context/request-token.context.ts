import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request store for the caller's raw bearer token, propagated via
 * `AsyncLocalStorage` so the kalnostics-new API clients can forward the SAME
 * token on service-to-service calls without threading it through every method
 * signature (mirrors the tenant-context pattern).
 *
 * Populated by `RequestTokenInterceptor` from the `Authorization` header.
 */
export interface RequestTokenStore {
  /** The raw bearer token (without the "Bearer " prefix), if present. */
  bearerToken?: string;
}

/** The shared async-context store for the current request's bearer token. */
export const requestTokenContext = new AsyncLocalStorage<RequestTokenStore>();

/** The bearer token for the current async context, if any. */
export function getBearerToken(): string | undefined {
  return requestTokenContext.getStore()?.bearerToken;
}
