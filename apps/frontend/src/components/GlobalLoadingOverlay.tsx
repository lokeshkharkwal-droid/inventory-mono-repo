import { useSyncExternalStore } from 'react';
import { LottieLoader } from '@/components/LottieLoader';
import {
  getActiveRequestCount,
  subscribeRequestActivity,
} from '@/lib/request-activity';

/**
 * App-wide loading overlay. Mounted once at the root, it watches the global
 * in-flight request counter (see `lib/request-activity.ts`) and renders the
 * branded full-screen {@link LottieLoader} whenever *any* API call is in flight.
 *
 * This is the single source of loading UI for network activity — every request
 * that goes through the HTTP layer surfaces it automatically, no per-page wiring.
 */
export function GlobalLoadingOverlay() {
  const active = useSyncExternalStore(
    subscribeRequestActivity,
    getActiveRequestCount,
    getActiveRequestCount,
  );

  if (active <= 0) return null;

  return <LottieLoader fullScreen label="Loading…" />;
}

export default GlobalLoadingOverlay;
