/**
 * Global in-flight API-request tracker.
 *
 * The HTTP layer (`lib/http.ts`) bumps this counter up on every outgoing request
 * and back down when it settles (success or error). The app mounts a single
 * {@link GlobalLoadingOverlay} that subscribes here and shows the branded loader
 * whenever at least one request is in flight — so *any* API call surfaces the
 * loader without per-page wiring.
 */

let activeCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  });
}

/** Mark one request as started. Pair with exactly one {@link endRequest}. */
export function beginRequest(): void {
  activeCount += 1;
  emit();
}

/** Mark one request as settled (fulfilled or rejected). */
export function endRequest(): void {
  activeCount = Math.max(0, activeCount - 1);
  emit();
}

/** Current number of in-flight requests. */
export function getActiveRequestCount(): number {
  return activeCount;
}

/** True while at least one API request is in flight. */
export function isRequestActive(): boolean {
  return activeCount > 0;
}

/**
 * Subscribe to activity changes (for `useSyncExternalStore`). Returns an
 * unsubscribe function.
 */
export function subscribeRequestActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
