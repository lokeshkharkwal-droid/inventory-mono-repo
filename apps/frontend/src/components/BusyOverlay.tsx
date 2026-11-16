import { cn } from '@/lib/utils';
import { LottieLoader } from '@/components/LottieLoader';

export interface BusyOverlayProps {
  /**
   * Whether to show the overlay — typically a TanStack Query `isFetching` that is
   * true while re-querying over data that is already on screen (search, filter,
   * pagination, background refetch).
   */
  show: boolean;
  /** Optional caption under the animation (e.g. "Updating…"). */
  label?: string;
  /** Animation size in px. Default 56 (smaller than a full-view loader). */
  size?: number;
  /**
   * Block pointer events while busy. Default false — the overlay is purely
   * visual so filters/inputs stay usable; duplicate-submit prevention is the
   * job of disabled buttons. Set true for a region that must not be touched
   * mid-operation (e.g. a form being saved).
   */
  blocking?: boolean;
  className?: string;
}

/**
 * Absolutely-positioned "refetching / updating" overlay for a region that
 * already shows content — tables, summary cards, report shells, custom grids.
 *
 * The parent element MUST be `position: relative`. The overlay dims the content
 * and centers the shared branded loader, so a re-query reads clearly as
 * "updating" instead of silently swapping rows (or leaving stale data with no
 * cue). This is the app-wide standard for table/section-level in-flight state.
 *
 * @param show     render the overlay when true
 * @param label    optional caption
 * @param size     animation size in px (default 56)
 * @param blocking block clicks while busy (default false — visual only)
 */
export function BusyOverlay({ show, label, size = 56, blocking = false, className }: BusyOverlayProps) {
  if (!show) return null;
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/55 backdrop-blur-[1px]',
        blocking ? 'pointer-events-auto cursor-wait' : 'pointer-events-none',
        className,
      )}
    >
      <LottieLoader size={size} label={label} className="gap-2 py-0" />
    </div>
  );
}

export default BusyOverlay;
