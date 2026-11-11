/**
 * ProfileSwitcher — sidebar control (under the company logo) that lets a
 * multi-profile user switch their active branch/role without logging out.
 *
 * Ported from the kaltros-fe sidebar switcher so the Inventory app shares the
 * same branch-switching experience: clicking the control expands an inline list
 * of every branch/role *inside the sidebar* (no popup), grouped by branch;
 * clicking it again, pressing Escape, or choosing a profile closes it. On select
 * it swaps the session to the new profile's token and reloads so every query
 * re-fetches under the new context. Hidden entirely for single-profile users.
 */
import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { Building2, Check, ChevronDown, Globe, Loader2 } from 'lucide-react';
import {
  getTokenPayload,
  switchProfile,
  getApiErrorMessage,
  type JwtProfile,
} from '@/lib/http';
import { cn } from '@/lib/utils';

/** Stable identity for a profile entry (branch + role pair). */
const profileId = (p: JwtProfile): string =>
  `${p.branch_id ?? 'tenant'}:${p.profile_key}`;

export function ProfileSwitcher() {
  const payload = getTokenPayload();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const profiles = useMemo(() => payload?.profiles ?? [], [payload]);

  // Group a user's assignments by branch (tenant-level profiles share one group).
  const groups = useMemo(() => {
    const byBranch = new Map<
      string,
      { label: string; isTenant: boolean; items: JwtProfile[] }
    >();
    for (const p of profiles) {
      const isTenant = !p.branch_id;
      const key = p.branch_id ?? '__tenant__';
      const group = byBranch.get(key) ?? {
        label: isTenant ? 'Organization-wide' : (p.branch_name ?? 'Branch'),
        isTenant,
        items: [],
      };
      group.items.push(p);
      byBranch.set(key, group);
    }
    return [...byBranch.values()];
  }, [profiles]);

  // Close on Escape handled below; nothing to switch between → render nothing.
  if (!payload || profiles.length <= 1) return null;

  const isActive = (p: JwtProfile): boolean =>
    p.profile_key === payload.active_profile_key &&
    (p.branch_id ?? null) === (payload.active_branch_id ?? null);

  const current = profiles.find(isActive) ?? profiles[0];
  if (!current) return null;

  const handleSelect = async (p: JwtProfile): Promise<void> => {
    if (isActive(p) || pendingId) return;
    setPendingId(profileId(p));
    try {
      await switchProfile(p.profile_key, p.branch_id ?? null);
      toast.success('Profile switched.');
      // Reload so permissions + all data re-fetch under the new profile.
      window.location.reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not switch profile'));
      setPendingId(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="w-full" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Switch profile or branch"
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white outline-none transition-all',
          'bg-white/10 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40',
          open && 'bg-white/15',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
          <Building2 size={14} />
        </div>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-medium text-white">
            {current.profile_label}
          </span>
          <span className="truncate text-[10px] text-white/60">
            {current.branch_name ?? 'Organization-wide'}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-white/60 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Inline list. The grid-rows trick animates the height without a fixed
          value; `invisible` while closed removes it from the tab order. */}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows,opacity,margin,visibility] duration-200 ease-out',
          open
            ? 'visible mt-2 grid-rows-[1fr] opacity-100'
            : 'invisible mt-0 grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'max-h-[max(10.5rem,min(40dvh,24rem))] overflow-y-auto overscroll-contain',
              'rounded-lg border border-white/10 bg-black/15 p-1.5',
              'profile-switcher-scroll',
            )}
          >
            <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              Switch profile
            </p>
            {groups.map((group, gi) => (
              <div key={group.label + gi} className={cn(gi > 0 && 'mt-1.5')}>
                <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-white/60">
                  {group.isTenant ? (
                    <Globe size={12} className="shrink-0" />
                  ) : (
                    <Building2 size={12} className="shrink-0" />
                  )}
                  <span className="truncate">{group.label}</span>
                </p>
                {group.items.map((p) => {
                  const active = isActive(p);
                  const id = profileId(p);
                  const pending = pendingId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => void handleSelect(p)}
                      disabled={active || pendingId !== null}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm outline-none transition-colors',
                        'text-white/85 hover:bg-white/10 focus-visible:bg-white/15',
                        active && 'bg-white/15 font-medium text-white',
                        !active && pendingId !== null && 'opacity-60',
                        'disabled:cursor-default',
                      )}
                    >
                      <span className="min-w-0 truncate">{p.profile_label}</span>
                      {active && (
                        <Check size={15} className="shrink-0 text-emerald-300" />
                      )}
                      {pending && (
                        <Loader2
                          size={15}
                          className="shrink-0 animate-spin text-white/70"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
