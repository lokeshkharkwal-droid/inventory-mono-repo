import { lazy, Suspense, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import loaderSrc from '@/assets/lottie/loader.lottie';
// Self-hosted ThorVG WASM runtime (copied verbatim from the installed
// `@lottiefiles/dotlottie-web` dist). `?url` emits it as a content-hashed asset
// and resolves to its URL without pulling the player's JS eagerly. Keep this
// file in sync with the installed dotlottie-web version. See `setWasmUrl` below.
import playerWasmUrl from '@/assets/lottie/dotlottie-player.wasm?url';

/**
 * Lazily-loaded dotLottie player. Code-splitting the
 * `@lottiefiles/dotlottie-react` runtime into its own chunk keeps it out of the
 * eager bundle (see `manualChunks` in vite.config.ts) — it is fetched only the
 * first time a loader actually renders.
 *
 * By default the player downloads its ThorVG WASM from a third-party CDN
 * (jsdelivr/unpkg) at runtime; if that CDN is unreachable (offline, blocked, or
 * slow) the animation silently never renders. We pin it to our own bundled,
 * same-origin copy via `setWasmUrl` so the loader works with zero external
 * dependencies.
 */
const DotLottie = lazy(() =>
  import('@lottiefiles/dotlottie-react').then((m) => {
    m.setWasmUrl(playerWasmUrl);
    return { default: m.DotLottieReact };
  }),
);

export interface LottieLoaderProps {
  /** Side length of the square animation, in px. Defaults to 96. */
  size?: number;
  /** Optional caption rendered under the animation. */
  label?: string;
  /** Cover the viewport with a translucent backdrop (route-level transitions). */
  fullScreen?: boolean;
  /** Replace the default wrapper classes (centering / padding / backdrop). */
  className?: string;
}

/**
 * Branded loading indicator backed by the project's `loader.lottie` animation.
 *
 * Drop-in replacement for the previous centered spinner / "Loading…" full-view
 * states: render it whenever a `useQuery` loading boolean is `true`.
 *
 * @param size       animation square side in px (default 96)
 * @param label      optional caption shown under the animation
 * @param fullScreen when true, overlays the whole viewport with a backdrop
 * @param className  overrides the default wrapper classes
 * @returns the loader element (announced to assistive tech via `role="status"`)
 */
export function LottieLoader({ size = 96, label, fullScreen = false, className }: LottieLoaderProps) {
  const dim: CSSProperties = { width: size, height: size };
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        fullScreen
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm'
          : 'flex flex-col items-center justify-center gap-3 py-16',
        className,
      )}
    >
      {/* Reserve the box so layout doesn't jump while the player chunk loads. */}
      <Suspense fallback={<div style={dim} />}>
        <DotLottie src={loaderSrc} loop autoplay style={dim} />
      </Suspense>
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LottieLoader;
