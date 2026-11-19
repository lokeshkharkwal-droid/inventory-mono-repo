import { cn } from '@/lib/utils';
import { formatCount, noteLimitState } from '@/lib/text-limits';

/**
 * Shows how long a note is once it gets close to the limit, and a clear warning once it is over. Says nothing for a
 * normal note, so the editor stays uncluttered.
 *
 * @param length characters in the note (its HTML)
 * @param max the limit
 */
export function CharacterCounter({
  length,
  max,
}: {
  length: number;
  max: number;
}) {
  const state = noteLimitState(length, max);
  if (state === 'ok') return null;
  const over = state === 'over';
  return (
    <p
      role={over ? 'alert' : 'status'}
      className={cn(
        'mt-1 text-right text-xs',
        over ? 'font-medium text-red-600' : 'text-amber-600',
      )}
    >
      {over
        ? `Too long: ${formatCount(length)} / ${formatCount(max)} characters. Shorten the text to save.`
        : `${formatCount(length)} / ${formatCount(max)} characters`}
    </p>
  );
}
